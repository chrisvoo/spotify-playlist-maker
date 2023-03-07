import { readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import glob from 'glob'
import Playlist from './Playlist.js';

export default class Scanner {
    allowedExtensions = ['flac', 'mp3']
    /** @var {Playlist[]} */
    playlists = []

    async scan(dir) {
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
            }
        }

        if (rootPlaylist.tracks.length > 0) {
            this.playlists.push(rootPlaylist)
        }

        const remainingPlaylists = this.playlists.filter(p => p.path !== dir)

        for (const pl of remainingPlaylists) {
            const globPattern = `**/*.{${this.allowedExtensions.join(',')}}`
            const files = await glob(globPattern, { realpath: true, cwd: pl.path, absolute: true })
            await pl.addTracks(files)
        }
    }
}