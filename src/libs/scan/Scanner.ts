import { readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import glob from 'glob'
import Playlist from './Playlist.js';
import SpotifyClient from '../spotifyClient.js';
import Track from './Track.js';

export default class Scanner {
    allowedExtensions: string[] = ['flac', 'mp3']
    playlists: Playlist[] = []
    #client: SpotifyClient
    /**
     * {
     *    artist_spotify_id: {
     *      <album_name>: [
     *          {
     *              track_name: {string},
     *              track_spotify_id: {string}
     *          }
     *      ]
     *    }
     * }
     */
    // #cache

    /**
     *
     * @param {SpotifyClient} client
     */
    constructor(client: SpotifyClient) {
        this.#client = client
    }

    async scan(dir: string): Promise<void> {
        const files = await readdir(path.resolve(dir))
        const rootPlaylist = new Playlist(dir) // used only if contains files

        // first-level deep are playlists
        for (const file of files) {
            const item = path.resolve(path.join(dir, file))
            const stat = await lstat(item)
            let playlist

            if (
                stat.isFile() &&
                this.allowedExtensions.includes(path.extname(item).replace('.', ''))
            ) {
                await rootPlaylist.addTrack(item)
            } else if (stat.isDirectory()) {
                playlist = new Playlist(item)
                this.playlists.push(playlist)
                await this.#client.createPlaylist(playlist.name!)
            }
        }

        if (rootPlaylist.tracks.length > 0) {
            this.playlists.push(rootPlaylist)
            await this.#client.createPlaylist(rootPlaylist.name!)
        }

        const remainingPlaylists = this.playlists.filter(p => p.path !== dir)

        for (const pl of remainingPlaylists) {
            const globPattern = `**/*.{${this.allowedExtensions.join(',')}}`
            const files = await glob(globPattern, { realpath: true, cwd: pl.path, absolute: true })
            await pl.addTracks(files)
        }
    }

    async searchTrack(track: Track) {
        // this.#client.searchTrack()
    }
}