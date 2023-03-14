import { request, Dispatcher } from 'undici'
import logger from './logger.js'

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

export interface PlaylistItemsRequest extends SpotifyRequest {
    fields?: string
}

export interface SearchParams extends SpotifyRequest {
    q: string
}

export interface SearchById extends SpotifyRequest {
    id: string
}

export type UserProfile = SpotifyApi.UserObjectPrivate &
                          SpotifyApi.UserObjectPublic

export interface AddTracksRequest {
    playlistId: string,
    tracks: string[]
}

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

            logger.info(`getToken ${formData.get('grant_type')} ${statusCode}`)


            return body.json()
        } catch (e: any) {
            logger.error(`Error retrieving the ${formData.get('grant_type')}: ${e.stack}`)
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

    /**
     * It gets a new token via refresh token when the token is expired
     * @param expiresIn
     * @param refreshToken
     */
    #refreshToken(expiresIn: number, refreshToken: string) {
        setInterval(async () => {
            const res = await this.#getRefreshToken(refreshToken)
            if (res !== null) {
                const { access_token} = res
                this.token = access_token
            }
        }, (expiresIn * 1000))
    }

    /**
     * Checks if we already got an access token, otherwise we get a new one and we schedule the
     * automatic refresh token retrieval
     */
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

    /**
     * Shared method for calling API
     * @param params
     * @returns
     */
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
            logger.info(`apiCall ${endpoint}: ${statusCode}`)

            return body.json()
        } catch (e: any) {
            logger.error(`Error ${endpoint}: ${e.message} - ${e.stack}`)
        }
    }

    /**
     * Get detailed profile information about the current user (including the current user's username).
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
     * @returns
     */
    async getMyDetails(): Promise<UserProfile> {
        return this.#apiCall({ endpoint: '/me' })
    }

    /**
     * Get a list of the playlists owned or followed by a Spotify user.
     * @param {SpotifyRequest} params
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/get-list-users-playlists
     * @returns
     */
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
     * Retrieves the tracks inside a playlist. By default, only a subset of all the available fields are returned.
     * @param playlistId The playlist ID
     * @param params
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/get-playlists-tracks
     * @returns
     */
    getPlaylistItems(playlistId: string, params?: PlaylistItemsRequest): Promise<SpotifyApi.PlaylistTrackResponse> {
        let limit = 20
        let offset = 0

        if (params?.limit && Number.isInteger(params.limit) && params.limit >= 0 && params.limit <= 50) {
            limit = params.limit
        }

        if (params?.offset && Number.isInteger(params.offset) && params.offset >= 0 && params.offset <= 100000) {
            offset = params.offset
        }

        return this.#apiCall({
            endpoint: `/playlists/${playlistId}/tracks`,
            query: {
                limit,
                offset,
                fields: params?.fields ?? 'total,next,items(track(id,name,artists(id,name)))'
            }
        })
    }

    /**
     * Create a playlist for a Spotify user. (The playlist will be empty until you add tracks.)
     * @param {string} name The playlist's name
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/create-playlist
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

    /**
     * Get Spotify catalog information about albums, artists, playlists, tracks, shows, episodes or audiobooks that match a keyword string.
     * @param {SearchParams} params
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/search
     * @returns
     */
    async searchTrack(params: SearchParams): Promise<SpotifyApi.TrackSearchResponse> {
        const { limit = 1, offset = 0, q } = params

        if (!q || typeof q != 'string' || q.trim().length === 0) {
            throw new Error('param q is mandatory for search')
        }

        return this.#apiCall({
            endpoint: '/search',
            query: {
                limit,
                offset,
                type: 'track',
                q
            }
        })
    }

    /**
     * Get Spotify catalog information about an artist's albums.
     * @param {SearchById} params
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/get-an-artists-albums
     * @returns
     */
    async getAlbumsByArtist(params: SearchById): Promise<SpotifyApi.ArtistsAlbumsResponse> {
        const { limit = 50, offset = 0, id } = params

        if (!id) {
            throw new Error('getAlbumsByArtist: id is required')
        }

        return this.#apiCall({
            endpoint: `/artists/${id}/albums`,
            query: {
                id,
                limit,
                offset,
                include_groups: 'album'
            }
        })
    }

    /**
     * Get Spotify catalog information about an album’s tracks. Optional parameters can be used to limit the number
     * of tracks returned.
     * @param params
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/get-an-albums-tracks
     * @returns
     */
    async getTracksByAlbum(params: SearchById): Promise<SpotifyApi.AlbumTracksResponse> {
        const { limit = 50, offset = 0, id } = params

        if (!id) {
            throw new Error('getTracksByAlbum: id is required')
        }

        return this.#apiCall({
            endpoint: `/albums/${id}/tracks`,
            query: {
                id,
                limit,
                offset
            }
        })
    }

    /**
     * Add tracks to a playlist.
     * The position to insert the items is a zero-based index. If omitted, the items will be appended to the playlist.
     * Items are added in the order they appear in the uris array.
     * @param params A maximum of 100 items can be added in one request. Note: if the uris parameter is present in the query string,
     * any URIs listed here in the body will be ignored.
     * @see https://developer.spotify.com/documentation/web-api/reference/#/operations/add-tracks-to-playlist
     * @returns
     */
    async addTracksToPlaylist(params: AddTracksRequest): Promise<SpotifyApi.AddTracksToPlaylistResponse> {
        const { playlistId, tracks } = params

        return this.#apiCall({
            endpoint: `/playlists/${playlistId}/tracks`,
            method: 'POST',
            body: {
                uris: tracks // spotify:track:<id>
            }
        })
    }
}