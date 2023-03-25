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

    isUniqueId(spotifyId: string) {
        let foundOccurrences = 0

        for (const track of this.tracks) {
            if (track.spotify_uri !== undefined && spotifyId === track.spotify_uri) {
                foundOccurrences++
            }
        }

        return foundOccurrences <= 1
    }

    async addTracks(files: string[]): Promise<void> {
        for (const file of files) {
            // let's do one by one instead of waiting for all promises
            await this.addTrack(file)
        }
    }

    hasTrack(uri?: string): boolean {
        if (uri === undefined) {
            return false
        }

        return this.tracks
                .filter(t => t.spotify_uri !== undefined)
                .map(t => t.spotify_uri)
                .includes(uri)
    }

    async addTrack(file: string): Promise<void> {
        let track = new Track()
        try {
            const info = await mediainfo(file)
            track.path = file

            if (info !== null) {
                const { title, album, artist, comment } = info
                track.album = album
                track.artist = artist
                track.track_name = title

                if (comment?.startsWith('spotify:track')) {
                    track.spotify_uri = comment
                }
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
        logger.info(`AddTrack: spotify uri (${track.spotify_uri}) has track? ${track.spotify_uri && this.hasTrack(track.spotify_uri)}`)
        if (this.hasTrack(track.spotify_uri)) {
            logger.info(`${track.track_name} is already in ${this.name}`)
            return
        }

        this.tracks.push(track)
    }
}