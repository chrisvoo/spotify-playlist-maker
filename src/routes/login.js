import qs from 'querystring'

/**
 * Login route
 * @param {App} app
 */
export default function login(app) {
    app.express.get('/login', (req, res) => {
        const { name : cookieName, value : cookieValue } = app.stateCookie
        res.cookie(cookieName, cookieValue);
        console.log('Redirecting for login...')

        res.redirect('https://accounts.spotify.com/authorize?' +
          qs.stringify({
            response_type: 'code',
            client_id: process.env.CLIENT_ID,
            scope: 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public',
            redirect_uri: process.env.REDIRECT_URI,
            state: cookieValue
          })
        )
    })
}