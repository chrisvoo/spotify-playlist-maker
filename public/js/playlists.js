$(document).ready(function () {
    $('#playlists').DataTable({
        processing: true,
        scrollY: '200px',
        scrollCollapse: true,
        serverSide: true,
        ajax: '/playlists',
        columns: [
            { data: 'name' },
            { data: 'description' },
            { data: 'tracks' },
            {
                data: 'public',
                render: function (data, type) {
                    if (type === 'display') {
                        console.log(data)
                        return data ? 'Y' : 'F'
                    }

                    return data
                }
            },
            {
                data: 'url',
                render: function (data, type) {
                    if (type === 'display') {
                        return '<a href="' + data + '" target="_blank">Link</a>'
                    }

                    return data
                }
            }
        ],
    });
});