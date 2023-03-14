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
     * It composes the query string parameter for search API
     * @returns
     */
    getSearchableTerm(): string {
        let query = `${this.track_name} `

        if (this.album !== undefined) {
            query += `album:${this.album} `
        }

        if (this.artist !== undefined) {
            query += `artist:${this.artist}`
        }

        return query.trim()
    }
}