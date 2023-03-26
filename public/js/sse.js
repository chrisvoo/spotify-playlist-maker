   // @ts-nocheck

   function hide(id) {
      document.getElementById(id).style.display = 'none'
   }

   function show(id) {
      document.getElementById(id).style.display = 'block'
   }

   document.addEventListener("DOMContentLoaded", function(e) {
      hide('activity-block')

      document.getElementById('activity-btn').onclick = async function (e) {
         e.preventDefault()

         show('activity-block')
         hide('scanner-stopped')
         document.getElementById('scanning-title').textContent = `Scanning ${SCANNING_DIRECTORY}`
         document.getElementById('status').textContent = 'started'

         const scanState = {
            playlists: 0,       // playlists created
            tracks: 0,          // tracks found on spotify
            tracks_skipped: 0,  // tracks not found
            errors: 0           // errors
         }

         const evtSource = new EventSource("/scan")

         evtSource.onmessage = (event) => {
            const { action, item, extra } = JSON.parse(event.data.trim())

            switch (action) {
               case 'progression': {
                  document.querySelector('.progress-bar').ariaValueNow = item;
                  document.querySelector('.progress-bar').style.width = `${item}%`;
               } break

               case 'playlist_created': {
                  scanState.playlists++
                  document.getElementById('message').textContent = `${action}: ${item}`
               } break

               case 'error': {
                  scanState.errors++
                  document.getElementById('message').textContent = `${action}: ${item}`
               } break

               case 'tracks_added': {
                  console.log(extra)
                  scanState.tracks += extra.found_tracks
                  scanState.tracks_skipped += extra.total_tracks - extra.found_tracks
                  document.getElementById('message').textContent = `${action}: ${item}`
               } break

               case 'done': {
                  evtSource.close()

                  hide('activity-block')
                  show('scanner-stopped')

                  document.getElementById('status').textContent = 'stopped'
                  document.getElementById('scanning-title').textContent = 'Scanning activity'
               } break
            }

            document.getElementById('last_update').textContent = `playlist: ${playlists}, tracks: ${tracks}, skipped: ${tracks_skipped}, errors: ${errors}`
         }
      }
   })