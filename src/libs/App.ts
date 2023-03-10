import express, { Application } from 'express'
import { Server } from 'node:http'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import sprightlyExpress from "sprightly/express"
import { randString } from './utils.js'
import index from '../routes/index.js'
import login from '../routes/login.js'
import oauth_callback from '../routes/oauth_callback.js'
import notFound from '../routes/notFound.js'
import internalError from '../routes/error.js'
import start from '../routes/start.js'
import playlists from '../routes/playlists.js'
import scan from '../routes/scan.js'
import temp from '../routes/temp.js'
import SpotifyClient from './spotifyClient.js'

export type AppOptions = {
    port?: number,
    spotifyCookieName?: string
}

export type StateCookie = {
    name: string,
    value: string
}

export default class App {
    /** {Express} app */
    express?: Application
    /** {int} express port */
    private port?: number
    /** {string} The state cookie */
    stateCookie?: StateCookie
    spotifyClient?: SpotifyClient

    constructor(options: AppOptions = {}) {
        this.express = express()
        this.port = options.port || 3000
        this.stateCookie = {
            name: options.spotifyCookieName || 'spotify_auth_state',
            value: randString()
        }

        this.express
            .use(express.static('./public'))
            .use(cors())
            .use(cookieParser())
            .set('view engine', 'html')
            .set('views', './views')
            .engine(
                "html",
                // @ts-ignore
                sprightlyExpress({
                    cache: false,
                    keyFallback: "obada",
                    throwOnKeyNotfound: true,
                }),
            )
    }

    setupRoutes(): this {
        index(this)
        login(this)
        oauth_callback(this)
        start(this)
        playlists(this)
        scan(this)
        temp(this) //  @todo delete it

        // errors last
        notFound(this)
        internalError(this)

        return this
    }

    /**
     * Starts the app
     * @returns {Promise<Server>} The server instance
     */
    async start(): Promise<Server> {
        return new Promise((resolve) => {
            const server = this.express!.listen(this.port, () => {
                console.log(`Server listening on http://localhost:${this.port}`)
                resolve(server)
            })
        })
    }
}