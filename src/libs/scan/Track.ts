export default class Track {
    track_name?: string
    album?: string
    artist?: string
    spotify_uri?: string
    path?: string

    isSearchable(): boolean {
        return this.track_name !== undefined && this.track_name.trim() !== '' &&
               (
                (this.album !== undefined && this.album.trim() !== '') ||
                (this.artist !== undefined && this.artist.trim() !== '')
               )
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