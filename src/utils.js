import crypto from 'crypto'
import { existsSync, lstatSync } from 'node:fs'

export function checkEnv() {
    if (
        !process.env.CLIENT_ID ||
        !process.env.CLIENT_SECRET ||
        !process.env.REDIRECT_URI ||
        !process.env.MUSIC_DIRECTORY
    ) {
        throw new Error('Missing required env variables! See .env.dist')
    }

    if (
        !existsSync(process.env.MUSIC_DIRECTORY) ||
        !lstatSync(process.env.MUSIC_DIRECTORY).isDirectory()
    ) {
        throw new Error('MUSIC_DIRECTORY must be a directory')
    }
}

export function randString(size = 32) {
    return crypto.randomBytes(size).toString('hex')
}