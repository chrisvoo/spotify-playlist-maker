import { readdir, lstat } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import glob from 'glob'
import Playlist from './Playlist.js';
import SpotifyClient from '../spotifyClient.js';
import Track from './Track.js';
import logger from '../logger.js';

export interface ScanEvent {
    action: string
    item?: string | number,
    extra?: any
}

export enum ScanEventAction {
    PLAYLIST_CREATED = 'playlist_created',
    TRACKS_ADDED = 'tracks_added',
    PROGRESSION = 'progression',
    ERROR = 'error',
    DONE = 'done'
}

export default class Scanner {
    allowedExtensions: string[] = ['flac', 'mp3']
    playlists: Playlist[] = []
    events = new EventEmitter()

    #client: SpotifyClient

    /**
     *
     * @param {SpotifyClient} client
     */
    constructor(client: SpotifyClient) {
        this.#client = client
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
                    let offsetTracks = 0
                    this.playlists.push(pl)

                    while(!stopTracksLoop) {
                        const result = await this.#client.getPlaylistItems(id, { limit, offset: offsetTracks })

                        for (const item of result.items) {
                            if (item.track) {
                                const { id, name, uri, artists, album: { name: albumName } } = item.track
                                const track = new Track()
                                track.spotify_uri = uri
                                track.track_name = name
                                track.album = albumName
                                track.artist = artists[0]?.name

                                pl.addSpotifyTrack(track)
                            }
                        }

                        if (result.next === null) {
                            stopTracksLoop = true
                        }

                        offsetTracks += limit
                    }
                }

                if (result.next === null) {
                    stopPlaylistLoop = true
                }

                offset += limit
            } catch (e: any) {
                this.events.emit('scan_event', {
                    action: 'error',
                    item: 'Error while retrieving playlists: ' + e.message
                })
                logger.error('Error while retrieving playlists: ' + e)
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
        logger.info('Scanning started')
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
                    this.events.emit('scan_event', {
                        action: ScanEventAction.PLAYLIST_CREATED,
                        item: playlist.name
                    })
                    playlist.spotify_id = res.id
                }

                this.playlists.push(playlist)
            }
        }

        let playlistsDone = 0

        if (rootPlaylist.tracks.length > 0) {
            if (!rootPlaylist.spotify_id) {
                const res = await this.#client.createPlaylist(rootPlaylist.name!)
                this.events.emit('scan_event', {
                    action: ScanEventAction.PLAYLIST_CREATED,
                    item: rootPlaylist.name
                })
                rootPlaylist.spotify_id = res.id
            }
            this.playlists.push(rootPlaylist)

            await this.addTracksToPlaylist(rootPlaylist)
            playlistsDone += 1

            this.events.emit('scan_event', {
                action: ScanEventAction.PROGRESSION,
                item: Math.round(100 / this.playlists.length)
            })
        }

        const remainingPlaylists = this.playlists.filter(p => p.path !== dir)

        for (const pl of remainingPlaylists) {
            const globPattern = `**/*.{${this.allowedExtensions.join(',')}}`
            const files = await glob(globPattern, { realpath: true, cwd: pl.path, absolute: true })
            await pl.addTracks(files)

            await this.addTracksToPlaylist(pl)
            ++playlistsDone

            this.events.emit('scan_event', {
                action: ScanEventAction.PROGRESSION,
                item: Math.round(100 * playlistsDone / this.playlists.length)
            })
        }

        this.events.emit('scan_event', {
            action: ScanEventAction.DONE
        })
    }

    async addTracksToPlaylist(playlist: Playlist) {
        logger.info(`Adding tracks for playlist ${playlist.name ?? playlist.path}`)

        if (playlist.tracks.length > 0) {
            logger.info(`${playlist.tracks.length} tracks to process...`)
            for (const track of playlist.tracks) {
                if (track.spotify_uri) {
                    continue
                }

                if (track.track_name && track.isSearchable()) {
                        logger.info(`Searching ${track.getSearchableTerm()}`)

                        try {
                            const trackRes = await this.#client.searchTrack({
                                q: track.getSearchableTerm()
                            })

                            if (trackRes.tracks.total !== 0) {
                                const trackObj = trackRes.tracks.items[0]
                                const artistName = trackObj.artists[0].name
                                track.spotify_uri = trackObj.uri
                                logger.info(`Found track ${track.getSearchableTerm()} by ${artistName}`)
                            } else {
                                logger.warn(`Nothing found for ${track.track_name ?? track.path}`)
                            }
                        } catch (e: any) {
                            const errorMessage = `Error searching ${track.getSearchableTerm()}: ${e.message}`
                            logger.error(errorMessage)
                            this.events.emit('scan_event', {
                                action: 'error',
                                item: errorMessage
                            })
                        }
                } else {
                    // this should never happen, check file name for parsing errors
                    logger.warn(`Skipping ${track.path}, not searchable!`)
                }
            }

            try {
                const tracksURI = playlist.tracks
                                        .filter(t => t.spotify_uri !== undefined)
                                        .map(t => t.spotify_uri!)

                const tracksStats = {
                    total_tracks: playlist.tracks,
                    found_tracks: tracksURI.length
                }

                await this.#client.addTracksToPlaylist({
                    playlistId: playlist.spotify_id!,
                    tracks: playlist.tracks
                                    .filter(t => t.spotify_uri !== undefined)
                                    .map(t => t.spotify_uri!)
                })

                this.events.emit('scan_event', {
                    action: ScanEventAction.TRACKS_ADDED,
                    item: playlist.name,
                    extra: tracksStats
                })
            } catch (e: any) {
                const errorMessage = `Error addTracksToPlaylist for playlist ${playlist.name}: ${e.message}`
                logger.error(errorMessage)
                this.events.emit('scan_event', {
                    action: 'error',
                    item: errorMessage
                })
            }
        }
    }
}