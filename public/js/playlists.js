

async function getPlaylists() {
    try {
        const response = await fetch('/playlists', {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            },
        })

        return response.json()
    } catch (e) {
        console.error(`Error retrieving the token: ${e.stack}`)
    }
}

document.addEventListener("DOMContentLoaded", function(e) {
    getPlaylists().then((res) => {
        const { recordsTotal, data } = res
        for (const playlist of data) {
            const { description, RowId, name, public, tracks, url } = playlist
            // @TODO add to table
        }
    })
});