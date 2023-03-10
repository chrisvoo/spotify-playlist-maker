import { Request, Response, NextFunction } from 'express';
import App from '../libs/App.js';

/**
 * not found route
 * @param {App} app
 */
export default function temp(app: App) {
    app.express!.get('/temp', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!app.spotifyClient || !app.spotifyClient.hasLoggedIn()) {
                return res.redirect('/')
            }

            const response = await app.spotifyClient.createPlaylist('pippo')
            res.json(response)
        } catch (e) {
            return next(e)
        }
    })
}