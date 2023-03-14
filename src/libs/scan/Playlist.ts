import path from "node:path"
import Track from "./Track.js"
import mediainfo from "../mediainfo/mediainfo.js"
import logger from "../logger.js"

export default class Playlist {
    spotify_id?: string
    name?: string
    tracks: Track[] = []
    path?: string

    setLocalDir(dir: string): this {
        this.path = dir
        this.name = path.basename(dir)
        return this
    }

    async addTracks(files: string[]): Promise<void> {
        for (const file of files) {
            // let's do one by one instead of waiting for all promises
            await this.addTrack(file)
        }
    }

    async addTrack(file: string): Promise<void> {
        let track = new Track()
        try {
            const info = await mediainfo(file)
            track.path = file

            if (info !== null) {
                const { title, album, artist } = info
                track.album = album
                track.artist = artist
                track.track_name = title
            } else {
                const { name } = path.parse(file)
                track.track_name = name
            }
        } catch (e: any) {
            logger.error('Cannot parse file: ' + e.message)
            const { name } = path.parse(file)
            track.track_name = name
        }

        // let's check if this track has already been added to this playlist
        const res = this.tracks.filter((t) => t.track_name?.trim().toLowerCase() === track.track_name)
        if (res.length > 0) {
            return
        }

        this.tracks.push(track)
    }
}