import path from "node:path"
import Track from "./Track.js"
import mediainfo from "../mediainfo/mediainfo.js"

export default class Playlist {
    /** @var {string} */
    spotify_id
    /** @var {string} */
    name
    /** @var {Track[]} */
    tracks = []
    /** @var {string} local path */
    path

    constructor(dir) {
        this.path = dir
        this.name = path.basename(dir)
    }

    async addTracks(files) {
        for (const file of files) {
            // let's do one by one instead of waiting for all promises
            await this.addTrack(file)
        }
    }

    async addTrack(file) {
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
        } catch (e) {
            console.error('Cannot parse file: ' + e.message)
            const { name } = path.parse(file)
            track.track_name = name
        }

        this.tracks.push(track)
    }
}