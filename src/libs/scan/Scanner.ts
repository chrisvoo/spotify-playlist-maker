import { readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import glob from 'glob'
import Playlist from './Playlist.js';
import SpotifyClient from '../spotifyClient.js';
import Cache from './cache/Cache.js';
import CacheItem from './cache/CacheItem.js';
import CacheTrack from './cache/CacheTrack.js';
import Track from './Track.js';
import logger from '../logger.js';

export default class Scanner {
    allowedExtensions: string[] = ['flac', 'mp3']
    playlists: Playlist[] = []
    #client: SpotifyClient
    #cache: Cache

    /**
     *
     * @param {SpotifyClient} client
     */
    constructor(client: SpotifyClient) {
        this.#client = client
        this.#cache = new Cache()
    }

    async retrievePlaylists() {
        const limit = 50
        let offset = 0
        let stopPlaylistLoop = false

        while (!stopPlaylistLoop) {
            try {
                const result = await this.#client.getPlaylists({
                    limit,
                    offset
                })

                for (const playlist of result.items) {
                    const { id, name } = playlist
                    const pl = new Playlist()
                    pl.name = name
                    pl.spotify_id = id

                    let stopTracksLoop = false

                    while(!stopTracksLoop) {
                        const result = await this.#client.getPlaylistItems(id)

                        for (const item of result.items) {
                            if (item.track) {
                                const { id, name, uri, artists } = item.track
                                const track = new Track()
                                track.spotify_uri = uri
                                track.track_name = name
                                track.artist = artists[0].name
                            }
                        }
                    }
                }

                if (result.next === null) {
                    stopPlaylistLoop = true
                }

                offset += limit
            } catch (e: any) {
                logger.error('Error while retrieving playlists: ' + e.message)
                break
            }
        }

        logger.info(`Finished retrieving playlist. Got ${this.playlists.length}`)
    }

    /**
     * Returns a reference to a remote playlist or a new playlist if we don't have
     * any match among those already been created
     * @param dir The directory's name
     * @returns
     */
    getPlaylistByDir(dir: string): Playlist {
        const res = this.playlists.filter((p) => p.name === dir)
        if (res.length === 1) {
            logger.info(`Remote playlist found for ${dir}`)
            return res[0]
        }

        logger.info('Creating new playlist: ' + dir)
        return new Playlist().setLocalDir(dir)
    }

    async scan(dir: string): Promise<void> {
        // 1. retrieve all the current user's playlists
        await this.retrievePlaylists()


        const files = await readdir(path.resolve(dir))
        const rootPlaylist = this.getPlaylistByDir(dir) // used only if contains files

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
                playlist = this.getPlaylistByDir(item)

                // let's create it only if it doesn't exist on spotify
                if (!playlist.spotify_id) {
                    const res = await this.#client.createPlaylist(playlist.name!)
                    playlist.spotify_id = res.id
                }

                this.playlists.push(playlist)
            }
        }

        if (rootPlaylist.tracks.length > 0) {
            if (!rootPlaylist.spotify_id) {
                const res = await this.#client.createPlaylist(rootPlaylist.name!)
                rootPlaylist.spotify_id = res.id
            }
            this.playlists.push(rootPlaylist)

            await this.addTracksToPlaylist(rootPlaylist)
        }

        const remainingPlaylists = this.playlists.filter(p => p.path !== dir)

        for (const pl of remainingPlaylists) {
            const globPattern = `**/*.{${this.allowedExtensions.join(',')}}`
            const files = await glob(globPattern, { realpath: true, cwd: pl.path, absolute: true })
            await pl.addTracks(files)

            await this.addTracksToPlaylist(pl)
        }
    }

    async addTracksToPlaylist(playlist: Playlist) {
        logger.info(`Adding tracks for playlist ${playlist.name ?? playlist.path}`)

        if (playlist.tracks.length > 0) {
            logger.info(`${playlist.tracks.length} tracks to process...`)
            for (const track of playlist.tracks) {
                if (track.track_name) {
                    const cacheItem = this.#cache.getArtist(track.artist)
                    if (cacheItem) {
                        logger.info(`${cacheItem.artistName} in cache`)
                        const cacheTrack = cacheItem.getTrack(track.track_name, track.album)
                        if (cacheTrack) {
                            logger.info(`${cacheTrack.trackName} in cache`)
                            track.spotify_uri = cacheTrack.trackSpotifyURI
                            continue
                        }
                    }

                    if (track.isSearchable()) {
                        logger.info(`Searching ${track.getSearchableTerm()}`)
                        const trackRes = await this.#client.searchTrack({
                            q: track.getSearchableTerm()
                        })

                        if (trackRes.tracks.total !== 0) {
                            const trackObj = trackRes.tracks.items[0]
                            const { id: artistId, name, uri } = trackObj.artists[0]
                            track.spotify_uri = uri

                            const cacheItem = new CacheItem()
                            cacheItem.artistName = name
                            cacheItem.artistiId = artistId

                            logger.info(`Getting albums for ${name}`)
                            const albums = await this.#client.getAlbumsByArtist({
                                id: artistId
                            })

                            logger.info(`Got ${albums.total} albums`)

                            if (albums.total > 0) {
                                for (const album of albums.items) {
                                    const cacheTrack = new CacheTrack()

                                    const { id: albumId, name: albumName } = album

                                    logger.info(`Getting tracks for ${albumName}`)
                                    const tracksByAlbumRes = await this.#client.getTracksByAlbum({
                                        id: albumId
                                    })

                                    cacheTrack.albumName = albumName
                                    cacheTrack.albumId = albumId

                                    logger.info(`Found ${tracksByAlbumRes.total} tracks`)

                                    if (tracksByAlbumRes.total > 0) {
                                        for (const item of tracksByAlbumRes.items) {
                                            const { uri, name } = item
                                            cacheTrack.trackName = name
                                            cacheTrack.trackSpotifyURI = uri
                                        }
                                    }

                                    cacheItem.tracks.push(cacheTrack)
                                }

                                this.#cache.addItem(cacheItem)
                            }
                        }
                    }
                } else {
                    // this should never happen, check file name for parsing errors
                    logger.warn(`Skipping ${track.path}, no track name!`)
                }
            }

            await this.#client.addTracksToPlaylist({
                playlistId: playlist.spotify_id!,
                tracks: playlist.tracks
                                .filter(t => t.spotify_uri !== undefined)
                                .map(t => t.spotify_uri!)
            })

            logger.info(`Current track status: ${JSON.stringify(this.#cache.getStatus())}`)
        }
    }
}