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

    addSpotifyTrack(track: Track) {
        this.tracks.push(track)
    }

    async addTracks(files: string[]): Promise<void> {
        for (const file of files) {
            // let's do one by one instead of waiting for all promises
            await this.addTrack(file)
        }
    }

    hasTrack(trackName: string) {
        return this.tracks
                .filter(t => t.track_name !== undefined)
                .map(t => t.track_name!.trim().toLowerCase())
                .includes(trackName)
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
        if (this.hasTrack(track.track_name)) {
            logger.info(`${track.track_name} is already in ${this.name}`)
            return
        }

        this.tracks.push(track)
    }
}