import path from "node:path"
import Track from "./Track.js"
import mediainfo, { MediaResponse } from "../mediainfo/mediainfo.js"

export default class Playlist {
    spotify_id?: string
    name?: string
    tracks: Track[] = []
    path: string

    constructor(dir: string) {
        this.path = dir
        this.name = path.basename(dir)
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
            console.error('Cannot parse file: ' + e.message)
            const { name } = path.parse(file)
            track.track_name = name
        }

        this.tracks.push(track)
    }
}