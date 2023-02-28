
/**
 * not found route
 * @param {App} app
 */
export default function notFound(app) {
    // $ curl http://localhost:3000/notfound -H "Accept: application/json"
    // $ curl http://localhost:3000/notfound -H "Accept: text/plain"

    app.express.use((req, res, next) => {
        res.status(404);
0
        res.format({
            html: () => {
                res.render('errors/404', { url: req.url })
            },
            json: () => {
                res.json({ error: 'Not found' })
            },
            default: () => {
                res.type('txt').send('Not found')
            }
        })
    })
}