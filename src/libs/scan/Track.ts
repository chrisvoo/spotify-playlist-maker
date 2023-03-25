import { randomUUID } from "node:crypto"

export default class Track {
    duplicate: boolean = false
    track_name?: string
    album?: string
    artist?: string
    spotify_uri?: string
    path?: string
    remote: boolean = false // if it was retrieved by a remote playlist

    isSearchable(): boolean {
        return this.track_name?.trim() !== '' &&
               (this.album?.trim() !== '' || this.artist?.trim() !== '')
    }

    /**
     * It composes the query string parameter for search API. It uses just the artist
     * since spotify may have the song in a different album, EP, etc.
     * Let's use the album just in the weird case we don't have the artist's name
     * @returns
     */
    getSearchableTerm(): string {
        let query = `${this.track_name} `

        if (this.artist !== undefined) {
            query += `artist:${this.artist}`
        } else if (this.album !== undefined) {
            query += `album:${this.album} `
        }

        return query.trim()
    }
}