import { request, Dispatcher } from 'undici'

export type ClientError = {
    error: string,
    error_description: string
}

export interface ApiParams {
    endpoint: string,
    method?: Dispatcher.HttpMethod
    body?: Record<string,any> | string | Buffer | Uint8Array | FormData | null | undefined,
    query?: Record<string, string|number>
}

export interface SpotifyRequest {
    limit?: number,
    offset?: number
}

export interface SearchParams extends SpotifyRequest {
    q: string
}

export type UserProfile = SpotifyApi.UserObjectPrivate &
                          SpotifyApi.UserObjectPublic

export default class SpotifyClient {
    static TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
    static SPOTIFY_API_PREFIX = 'https://api.spotify.com/v1'
    private authCode?: string
    private token?: string
    userId?: string

    constructor(authCode: string) {
        this.authCode = authCode
    }

    #getBasicAuthHeader(): string {
        return  'Basic ' +
                    Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`)
                          .toString('base64')
    }

    hasLoggedIn(): boolean {
        return this.authCode !== undefined
    }

    /**
     * Get a token
     * @param {URLSearchParams} formData
     * @returns {Object|null} The object with access token or null if an error occurred
     */
    async #getToken(formData: URLSearchParams): Promise<any> {
        try {
            const { body, headers, statusCode } = await request(SpotifyClient.TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    Authorization: this.#getBasicAuthHeader(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                },
                body: formData.toString()
            })

            console.log(`getToken ${formData.get('grant_type')} ${statusCode}`)


            return body.json()
        } catch (e: any) {
            console.error(`Error retrieving the ${formData.get('grant_type')}: ${e.stack}`)
            return null
        }
    }

    async #getRefreshToken(refreshToken: string) {
        const formData = new URLSearchParams()
        formData.append('refresh_token', refreshToken)
        formData.append('grant_type', 'refresh_token')

        return this.#getToken(formData)
    }

    async #getAccessToken() {
        const formData = new URLSearchParams()
        formData.append('code', this.authCode!)
        formData.append('redirect_uri', process.env.REDIRECT_URI!)
        formData.append('grant_type', 'authorization_code')

        return this.#getToken(formData)
    }

    #raiseError(err: ClientError) {
        throw new Error(`${err.error}: ${err.error_description}`)
    }

    #refreshToken(expiresIn: number, refreshToken: string) {
        setInterval(async () => {
            const res = await this.#getRefreshToken(refreshToken)
            if (res !== null) {
                const { access_token} = res
                this.token = access_token
            }
        }, (expiresIn * 1000))
    }

    async #tokenCheck(): Promise<void> {
        if (!this.token) {
            const res = await this.#getAccessToken()
            if (res.error) {
                this.#raiseError(res)
            }
            const { access_token, expires_in, refresh_token } = res
            this.token = access_token
            this.#refreshToken(expires_in, refresh_token)
        }
    }

    async #apiCall(params: ApiParams): Promise<any> {
        const { endpoint, method = 'GET', body: reqBody, query = {} } = params

        await this.#tokenCheck()

        try {
            const { body, headers, statusCode } = await request(`${SpotifyClient.SPOTIFY_API_PREFIX}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                method,
                query,
                body: reqBody ? JSON.stringify(reqBody) : null
            })
            console.log(`apiCall ${endpoint}: ${statusCode}`)

            return body.json()
        } catch (e: any) {
            console.error(`Error ${endpoint}: ${e.message} - ${e.stack}`)
        }
    }

    async getMyDetails(): Promise<UserProfile> {
        return this.#apiCall({ endpoint: '/me' })
    }

    async getPlaylists(params?: SpotifyRequest): Promise<SpotifyApi.ListOfCurrentUsersPlaylistsResponse> {
        let limit = 20
        let offset = 0

        if (params?.limit && Number.isInteger(params.limit) && params.limit >= 0 && params.limit <= 50) {
            limit = params.limit
        }

        if (params?.offset && Number.isInteger(params.offset) && params.offset >= 0 && params.offset <= 100000) {
            offset = params.offset
        }

        return this.#apiCall({
            endpoint: `/users/${this.userId}/playlists`,
            query: {
                limit,
                offset
            }
        })
    }

    /**
     * It creates a playlist
     * @param {string} name The playlist's name
     * @returns
     */
    async createPlaylist(name: string): Promise<SpotifyApi.CreatePlaylistResponse> {
        return this.#apiCall({
            endpoint: `/users/${this.userId}/playlists`,
            method: 'POST',
            body: {
                name
            }
        })
    }

    async searchTrack(params: SearchParams): Promise<SpotifyApi.TrackSearchResponse> {
        const { limit = 1, offset = 0, q } = params

        if (!q || typeof q != 'string' || q.trim().length === 0) {
            throw new Error('param q is mandatory for search')
        }

        return this.#apiCall({
            endpoint: `/search`,
            query: {
                limit,
                offset,
                type: 'track',
                q
            }
        })
    }
}