import SpotifyClient from "../libs/spotifyClient.js";

/**
 * OAuth callback route
 * @param {App} app
 */
export default function oauth_callback(app) {
    app.express.get('/oauth_callback', (req, res) => {
        const { code, state } = req.query;
        const storedState = req.cookies ? req.cookies[app.stateCookie.name] : null;
        if (!state || state !== storedState) {
          res.render('errors/500', { error: 'state mismatch!' });
        } else {
          res.clearCookie(app.stateCookie.name);

          const client = new SpotifyClient(code)
          app.spotifyClient = client

          res.redirect('/start')
        }
    })
}