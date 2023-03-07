import crypto from 'crypto'
import { checkExecutable } from './mediainfo/mediainfo.js';

export async function checkEnv() {
    if (
        !process.env.CLIENT_ID ||
        !process.env.CLIENT_SECRET ||
        !process.env.REDIRECT_URI ||
        !process.env.MUSIC_DIRECTORY
    ) {
        throw new Error('Missing required env variables! See .env.dist')
    }

    try {
        console.log(await checkExecutable())
    } catch (e) {
        if (e.message.indexOf('not found') !== 0) {
            throw new Error('Please install mediainfo utility: https://mediaarea.net/en/MediaInfo/Download')
        }
    }
}

export function randString(size = 32) {
    return crypto.randomBytes(size).toString('hex')
}
