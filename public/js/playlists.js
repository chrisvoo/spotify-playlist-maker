// @ts-nocheck

let offset = 0, limit = 10

async function getPlaylists() {
    const response = await fetch('/playlists', {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
        },
    })

    return response.json()
}

function setLimitOffset(e) {
    e.preventDefault()
    limit = +e.target.innerText
    offset = 0
}

function addRows(data) {
    const tbody = document.querySelector('table.table>tbody');

    for (const playlist of data) {
        const { description, RowId, name, isPublic, tracks, url } = playlist
        const row = tbody.insertRow()
        const idCell = row.insertCell()
        idCell.setAttribute('class', 'd-none')
        idCell.append(RowId)
        row.insertCell().append(name)
        row.insertCell().append(description)
        row.insertCell().append(tracks)
        row.insertCell().append(isPublic)
        row.insertCell().innerHTML = `<a href="${url}" target="_blank">Open in Spotify</a>`
    }
}

document.addEventListener("DOMContentLoaded", function(e) {
    document.getElementById("pages-dropdown").onclick = setLimitOffset

    getPlaylists().then((res) => {
        const { recordsTotal, data } = res
        document.getElementById('caption-show-items').innerText = `Showing ${data.length} of ${recordsTotal} items`
        addRows(data)
    }).catch((e) => {
        console.error(`Error retrieving the token: ${e.stack}`)
    })
});