import CacheTrack from "./CacheTrack.js"

export default class CacheItem {
    artistName!: string
    artistiId!: string
    tracks: CacheTrack[] = []

    getTrack(trackName: string, album: string | undefined): CacheTrack | undefined {
        if (!album) {
            return undefined
        }

        const filter = this.tracks.filter((item) =>
                item.trackName.trim().toLowerCase() === trackName.trim().toLowerCase() &&
                item.albumName.trim().toLowerCase() === album.trim().toLowerCase())

        if (filter) {
            return filter[0]
        }

        return undefined
    }
}