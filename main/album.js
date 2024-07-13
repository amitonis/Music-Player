let currentAudio = null;
let currentTrackIndex = 0;
let currentTrackList = [];

function getAlbumIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('albumId');
}

function loadAlbum(albumId) {
    fetch('albums.json')
        .then(response => response.json())
        .then(albums => {
            const album = albums.find(album => album.id === albumId);
            if (album) {
                document.getElementById('albumCover').src = album.cover;
                document.getElementById('albumTitle').innerText = album.title;
                document.getElementById('albumArtist').innerText = album.artist;
                loadTracks(album.id);
            } else {
                console.error('Album not found');
            }
        })
        .catch(error => console.error('Error loading album:', error));
}

function loadTracks(albumId) {
    fetch('tracks.json')
        .then(response => response.json())
        .then(tracks => {
            const albumTracks = tracks.filter(track => track.albumId === albumId);
            currentTrackList = albumTracks;
            renderTracks(albumTracks);
        })
        .catch(error => console.error('Error loading tracks:', error));
}

function renderTracks(tracks) {
    const tracklistBody = document.getElementById('tracklistBody');
    tracklistBody.innerHTML = '';
    tracks.forEach((track, index) => {
        const trackElement = document.createElement('tr');
        trackElement.innerHTML = `
            <td>${index + 1}</td>
            <td class="track-title" data-index="${index}">${track.title}</td>
            <td id="duration-${index}">Loading...</td>
        `;
        tracklistBody.appendChild(trackElement);

        // Calculate duration
        calculateTrackDuration(track.mp3, index);
    });

    document.querySelectorAll('.track-title').forEach(title => {
        title.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            playTrack(index);
        });
    });
}

function calculateTrackDuration(src, index) {
    const audio = new Audio(src);
    audio.addEventListener('loadedmetadata', function() {
        document.getElementById(`duration-${index}`).innerText = formatTime(audio.duration);
    });
}

function playTrack(index) {
    currentTrackIndex = index;

    if (currentAudio) {
        currentAudio.pause();
    }
    const track = currentTrackList[index];
    currentAudio = new Audio(track.mp3);

    currentAudio.addEventListener('loadedmetadata', function() {
        document.getElementById('total-time').innerText = formatTime(currentAudio.duration);
    });

    currentAudio.play();
    currentAudio.addEventListener('timeupdate', updateSeekbar);
    currentAudio.addEventListener('ended', nextTrack);

    document.getElementById('trackImage').src = track.cover;
    document.getElementById('trackTitle').innerText = track.title;
    document.getElementById('trackArtist').innerText = track.artist;
    document.getElementById('trackAlbum').innerText = track.album;

    document.getElementById('playPauseButton').innerHTML = '<i class="fas fa-pause"></i>';
}

function setupPlayerControls() {
    document.getElementById('playPauseButton').addEventListener('click', () => {
        if (currentAudio) {
            if (currentAudio.paused) {
                currentAudio.play();
                document.getElementById('playPauseButton').innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                currentAudio.pause();
                document.getElementById('playPauseButton').innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    });

    document.getElementById('nextButton').addEventListener('click', nextTrack);
    document.getElementById('previousButton').addEventListener('click', previousTrack);
    document.getElementById('volumeSeekbar').addEventListener('input', (event) => {
        if (currentAudio) currentAudio.volume = event.target.value / 100;
    });
}

function updateSeekbar() {
    if (currentAudio) {
        const currentTime = currentAudio.currentTime;
        const duration = currentAudio.duration;
        const seekbar = document.getElementById('seekbar');
        seekbar.value = (currentTime / duration) * 100;
        document.getElementById('current-time').innerText = formatTime(currentTime);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % currentTrackList.length;
    playTrack(currentTrackIndex);
}

function previousTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + currentTrackList.length) % currentTrackList.length;
    playTrack(currentTrackIndex);
}

setupPlayerControls();

const albumId = getAlbumIdFromUrl();
if (albumId) {
    loadAlbum(albumId);
} else {
    console.error('Album ID not specified in URL');
}
