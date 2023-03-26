# Spotify Playlist Maker

This is a TypeScript app for creating playlists starting from your musuc files on yur computer grouped by directories named with the bands' names

## Local files

The script will traverse the file system starting for the main specified directory and using the directories' names as playlists' names and the files' names contained there as songs to be added to the playlists.
Despite the fact Spotify UI has folders in which you can organize your playlists, their API doen't give the possibility to manage them. That said, only the first-level deep directories will be used as main playlists, eventual subdirectories will be absorbed by the parent playlist.
Both playlists and songs will be created following alphabetical order.

## Constraints and rules

* If a playlist's name is already present among spotify's playlists, its ID will be used and we won't create a new one.
* If a song's name is already present inside a playlist, it will be skipped. I save the spotify ID inside the "comment" metatag of each file to make comparisons.

## Resources

* logo: [kiranshastry](https://www.flaticon.com/free-icon/playlist_876334)