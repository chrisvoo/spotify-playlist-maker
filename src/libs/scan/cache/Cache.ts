import CacheItem from "./CacheItem.js";

export interface CacheStatus {
    total_artists: number,
    total_tracks: number
}

export default class Cache {
    private items: CacheItem[] = []

    getArtist(artist: string | undefined): CacheItem | undefined {
        if (!artist) {
            return undefined
        }

        const filter = this.items.filter((item) => item.artistName.trim().toLowerCase() === artist.trim().toLowerCase())
        if (filter) {
            return filter[0]
        }

        return undefined
    }

    addItem(item: CacheItem) {
        this.items.push(item)
    }

    getStatus(): CacheStatus {
        let tracks = 0
        for (const item of this.items) {
            tracks += item.tracks.length
        }
        return { total_artists: this.items.length, total_tracks: tracks }
    }
}