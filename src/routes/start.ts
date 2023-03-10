import { Request, Response, NextFunction } from 'express';
import App from "../libs/App.js"

/**
 * not found route
 * @param {App} app
 */
export default function start(app: App) {
    app.express!.get('/start', async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!app.spotifyClient || !app.spotifyClient.hasLoggedIn()) {
                return res.redirect('/')
            }

            const details = await app.spotifyClient.getMyDetails()
            app.spotifyClient.userId = details.id

            res.render('start', {
                userid: details.id,
                name: details.display_name,
                email: details.email,
                country: details.country,
                image_url: details.images?.length ? details.images[0].url : '',
                product: details.product,
                type: details.type,
                user_profile_url: details.external_urls.spotify
            })
        } catch (e) {
            return next(e)
        }
    })
}