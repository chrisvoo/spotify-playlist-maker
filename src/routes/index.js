
/**
 * Login route
 * @param {App} app
 */
export default function index(app) {
    app.express.get('/', (req, res) => {
        res.render('index')
    })
}