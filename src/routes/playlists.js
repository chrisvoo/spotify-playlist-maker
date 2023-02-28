/**
 * not found route
 * @param {App} app
 */
export default function playlists(app) {
    app.express.get('/playlists', async (req, res, next) => {
        try {
            if (!app.spotifyClient || !app.spotifyClient.hasLoggedIn()) {
                return res.redirect('/')
            }

            console.log(req.query)
            /*
                {
                draw: '1',
                columns: [
                    {
                    data: '0',
                    name: '',
                    searchable: 'true',
                    orderable: 'true',
                    search: [Object]
                    },
                    {
                    data: '1',
                    name: '',
                    searchable: 'true',
                    orderable: 'true',
                    search: [Object]
                    },
                    {
                    data: '2',
                    name: '',
                    searchable: 'true',
                    orderable: 'true',
                    search: [Object]
                    },
                    {
                    data: '3',
                    name: '',
                    searchable: 'true',
                    orderable: 'true',
                    search: [Object]
                    },
                    {
                    data: '4',
                    name: '',
                    searchable: 'true',
                    orderable: 'true',
                    search: [Object]
                    }
                ],
                order: [ { column: '0', dir: 'asc' } ],
                start: '0',
                length: '10',
                search: { value: '', regex: 'false' },
                _: '1677532156173'
                }
            */

            const playlistsResponse = await app.spotifyClient.getPlaylists()
            const { limit, offset, total } = playlistsResponse

            const { draw } = req.query

            const data = playlistsResponse.items.map((item) => ({
                description: item.description,
                DT_RowId: item.id,
                name: item.name,
                public: item.public,
                tracks: item.tracks.total,
                url: item.external_urls.spotify
            }))

            res.json({
                draw,
                recordsTotal: total,
                recordsFiltered: total,
                data
            })
        } catch (e) {
            return next(e)
        }
    })
}