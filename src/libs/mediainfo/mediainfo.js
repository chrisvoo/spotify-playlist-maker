import { exec } from "node:child_process";

/**
 * Extracts through mediainfo CLI the metadata for identifying a track
 * @param {string} path File's absolute path
 * @returns {Promise<Object>}
 */
export default async function mediainfo(path) {
    return new Promise((resolve, reject) => {
        exec(`mediainfo --Output=JSON "${path}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            } else if (stderr) {
                reject(stderr)
            } else {
                const mediaResponse = JSON.parse(stdout)
                const subset = mediaResponse.media.track
                    .filter(o => o['@type'] === 'General')
                    .map(o => ({
                        title: o.Title,
                        album: o.Album,
                        artist: o.Album_Performer
                    }))
                if (subset && subset.length > 0) {
                    resolve(subset[0])
                } else {
                    resolve(null)
                }
            }
        })
    })
}

export async function checkExecutable() {
    return new Promise((resolve, reject) => {
        exec(`mediainfo --version`, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            } else if (stderr) {
                reject(stderr)
            } else {
                resolve(stdout)
            }
        })
    })
}