import { readdir, lstat } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import id3 from 'node-id3'
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
                                logger.debug(`track ${JSON.stringify(item.track)} for ${pl.name}`)
                                const { id, name, uri, artists, album } = item.track
                                const track = new Track()
                                track.remote = true
                                track.spotify_uri = uri
                                track.track_name = name
                                track.album = album?.name ?? null
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
                logger.error('Error while retrieving playlists: ' + e.message + e.stack)
                break
            }
        }

        logger.info(`Finished retrieving playlist. Got ${this.playlists.length}`)
        logger.info(`Playlist: ${this.playlists.map(p => p.name + ' ' + '(' + p.tracks.length + ')')}`)
    }

    /**
     * Returns a reference to a remote playlist or a new playlist if we don't have
     * any match among those already been created
     * @param dir The directory's name
     * @returns
     */
    getPlaylistByDir(dir: string): Playlist {
        const res = this.playlists.filter((p) => p.name === path.basename(dir))
        logger.info(`getPlaylistByDir: ${dir}, found: ${res.length}`)
        if (res.length === 1) {
            logger.info(`Remote playlist found for ${dir}`)
            res[0].setLocalDir(dir)
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

                    this.playlists.push(playlist)
                }
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

        // skip root playlist and remote-only playlists
        logger.debug(`Playlists: ${this.playlists.map(p => p.path).join(',')}, dir: ${dir}`)
        const remainingPlaylists = this.playlists.filter(p => p.path !== dir && p.path !== undefined)
        logger.debug(`Remaining playlist to do: ${remainingPlaylists.map(p => p.name).join(',')}`)

        for (const pl of remainingPlaylists) {
            const globPattern = `**/*.{${this.allowedExtensions.join(',')}}`
            const files = await glob(globPattern, { realpath: true, cwd: pl.path, absolute: true })
            await pl.addTracks(files)

            await this.addTracksToPlaylist(pl)
            playlistsDone += 1

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
                if (track.spotify_uri && track.remote) {
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

                            if (track.path) {
                                const res = id3.update({ comment: { language: 'eng', text: track.spotify_uri } }, track.path)
                                logger.info(`Written tag for ${track.path}: ${res}`)
                            }

                            // if for whatever reason we got a file without the spotify URI in the comment but
                            // already present in the playlist, we remove the track
                            if (!playlist.isUniqueId(track.spotify_uri)) {
                                logger.info(`Duplicate track found: ${track.track_name}`)
                                track.duplicate = true
                            }
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
                                        .filter(
                                            t => t.spotify_uri !== undefined &&
                                            t.remote === false &&
                                            t.duplicate === false
                                        )
                                        .map(t => t.spotify_uri!)

                const tracksStats = {
                    total_tracks: playlist.tracks.length,
                    found_tracks: playlist.tracks.filter(t => t.spotify_uri !== undefined).length
                }

                if (tracksURI.length !== 0) {
                    await this.#client.addTracksToPlaylist({
                        playlistId: playlist.spotify_id!,
                        tracks: tracksURI
                    })
                }

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