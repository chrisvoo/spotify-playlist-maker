import { Request, Response, NextFunction } from 'express';
import App from "../libs/App.js"

/**
 * not found route
 * @param {App} app
 */
export default function playlists(app: App) {
    app.express!.get('/playlists', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!app.spotifyClient || !app.spotifyClient.hasLoggedIn()) {
                return res.redirect('/')
            }

            const { limit, offset } = req.query
            const playlistsResponse = await app.spotifyClient.getPlaylists()
            const { total } = playlistsResponse

            const data = playlistsResponse.items.map((item) => ({
                description: item.description,
                RowId: item.id,
                name: item.name,
                isPublic: item.public,
                tracks: item.tracks.total,
                url: item.external_urls.spotify
            }))

            res.json({
                recordsTotal: total,
                data,
                limit,
                offset
            })
        } catch (e) {
            return next(e)
        }
    })
}