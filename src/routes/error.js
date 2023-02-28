/**
 * Error route
 * @param {App} app
 */
export default function internalError(app) {
    app.express.use(function(err, req, res, next){
        // we may use properties of the error object
        // here and next(err) appropriately, or if
        // we possibly recovered from the error, simply next().
        res.status(err.status || 500);
        res.render('errors/500', { error: err });
    });
}