# Spotify Playlist Maker

It covers two main scenarios:

* **local files**: you have some music files on yur computer grouped by directories named with the bands' names
* **JSON file**: you want to create a playlist by specifying its name and its content through a JSON file.

## Local files

The script will traverse the file system starting for the main specified directory and using the directories' names as playlists' names and the files' names contained there as songs to be added to the playlists.
Despite the fact Spotify UI has folders in which you can organize your playlists, their API doen't give the possibility to manage them. That said, only the first-level deep directories will be used as main playlists, eventual subdirectories will be absorbed by the parent playlist.
Both playlists and songs will be created following alphabetical order.  The final

## JSON file

The script will loop through the fields in the JSON file. The first-level deep fields will be used as playlists and the array of songs will be used to add songs to that playlist in that specific order.  Spotify IDS aren't required, this is the final output format. Example:

```json
{
    "Metal music": {
        "spotify_id": "<id>",
        "tracks": [
            {
                "track_name": "Battery",
                "album": "Master of Puppets",
                "artist": "Metallica",
                "spotify_id": "<id>"
            },
            ...
        ]
    },
    ...
}

```

Album and artists are mainly used for disambiguation purposes, the song's name is not enough by itself.

## Constraints and rules

* If a playlist's name is already present among spotify's playlists, its ID will be used
* If a song's name is already present inside a playlist, it will be skipped.

## Resources

* logo: [kiranshastry](https://www.flaticon.com/free-icon/playlist_876334)