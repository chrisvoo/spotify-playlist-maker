import { request } from 'undici'

export default class SpotifyClient {
    static TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
    static SPOTIFY_API_PREFIX = 'https://api.spotify.com/v1'
    #authCode
    #token
    userId

    constructor(authCode) {
        this.#authCode = authCode
    }

    #getBasicAuthHeader() {
        return  'Basic ' +
                    Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`)
                          .toString('base64')
    }

    hasLoggedIn() {
        return !this.#authCode ? false : true
    }

    /**
     * Get a token
     * @param {URLSearchParams} formData
     * @returns {Object|null} The object with access token or null if an error occurred
     */
    async #getToken(formData) {
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
        } catch (e) {
            console.error(`Error retrieving the ${formData.get('grant_type')}: ${e.stack}`)
            return null
        }
    }

    async #getRefreshToken(refreshToken) {
        const formData = new URLSearchParams()
        formData.append('refresh_token', refreshToken)
        formData.append('grant_type', 'refresh_token')

        return this.#getToken(formData)
    }

    async #getAccessToken() {
        const formData = new URLSearchParams()
        formData.append('code', this.#authCode)
        formData.append('redirect_uri', process.env.REDIRECT_URI)
        formData.append('grant_type', 'authorization_code')

        return this.#getToken(formData)
    }

    #raiseError(err) {
        throw new Error(`${err.error}: ${err.error_description}`)
    }

    #refreshToken(expiresIn, refreshToken) {
        setInterval(async () => {
            const res = await this.#getRefreshToken(refreshToken)
            if (res !== null) {
                const { access_token} = res
                this.#token = access_token
            }
        }, (expiresIn * 1000))
    }

    async #tokenCheck() {
        if (!this.#token) {
            const res = await this.#getAccessToken()
            if (res.error) {
                this.#raiseError(res)
            }
            const { access_token, expires_in, refresh_token } = res
            this.#token = access_token
            this.#refreshToken(expires_in, refresh_token)
        }
    }

    async #apiCall(endpoint) {
        await this.#tokenCheck()

        try {
            const { body, headers, statusCode } = await request(`${SpotifyClient.SPOTIFY_API_PREFIX}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.#token}`
                }
            })
            console.log(`apiCall ${endpoint}: ${statusCode}`)

            return body.json()
        } catch (e) {
            console.error(`Error ${endpoint}: ${e.message} - ${e.stack}`)
        }
    }

    async getMyDetails() {
        return this.#apiCall('/me')
    }

    async getPlaylists(params = {}) {
        let limit = 20
        let offset = 0

        if (Number.isInteger(params.limit) && params.limit >= 0 && params.limit <= 50) {
            limit = params.limit
        }

        if (Number.isInteger(params.offset) && params.offset >= 0 && params.offset <= 100000) {
            offset = params.offset
        }

        return this.#apiCall(`/users/${this.userId}/playlists?limit=${limit}&offset=${offset}`)
    }
}