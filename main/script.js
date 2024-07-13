let currentAudio = null;
let currentTrackIndex = 0;
let currentTrackList = [];
let filteredTrackList = [];
let fullTrackList = []; // Store the full list of tracks here
let currentAlbumList = [];
let filteredAlbumList = [];
let currentlyPlaying = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTracks();
    loadAlbums(); // Load albums as well
    setupSearch();
    setupPlayerControls();
});

function loadTracks() {
    fetch('tracks.json')
        .then(response => response.json())
        .then(data => {
            fullTrackList = data; // Store the full list of tracks
            currentTrackList = [...fullTrackList]; // Copy to currentTrackList
            shuffleTracks(); 
            renderRecommendedTracks(); 
        })
        .catch(error => console.error('Error loading tracks:', error));
}

function shuffleTracks() {
    currentTrackList.sort(() => Math.random() - 0.5); 
    currentTrackList = currentTrackList.slice(0, 20); 
}

function renderRecommendedTracks() {
    const recommendedSongs = document.querySelector('.recommended');
    recommendedSongs.innerHTML = '';
    currentTrackList.forEach(track => {
        const songItem = createSongItem(track);
        recommendedSongs.appendChild(songItem);
    });
}

function createSongItem(track) {
    const songItem = document.createElement('div');
    songItem.classList.add('song-item');
    songItem.innerHTML = `
        <img src="${track.cover}" alt="${track.title}">
        <a href="#" class="song-title"
        data-mp3="${track.mp3}"
        data-title="${track.title}"
        data-artist="${track.artist}"
        data-cover="${track.cover}">
        ${track.title}
        </a>
        <a href="#" class="song-artist">${track.artist}</a>
    `;
    songItem.querySelector('.song-title').addEventListener('click', (event) => {
        event.preventDefault();
        playSong(track);
    });
    return songItem;
}

function loadAlbums() {
    fetch('albums.json')
        .then(response => response.json())
        .then(data => {
            currentAlbumList = data;
            shuffleAlbums(); 
            renderAlbums();
        })
        .catch(error => console.error('Error loading albums:', error));
}

function shuffleAlbums() {
    currentAlbumList.sort(() => Math.random() - 0.5);
    currentAlbumList = currentAlbumList.slice(0, 3); 
}

function renderAlbums() {
    const albumsListDiv = document.getElementById('albumsList');
    albumsListDiv.innerHTML = '';
    currentAlbumList.forEach(album => {
        const albumElement = document.createElement('div');
        albumElement.classList.add('album-item');
        albumElement.innerHTML = `
            <a href="1.html?albumId=${album.id}" class="album-title">${album.title}</a>
            <p class="album-artist">${album.artist}</p>
        `;
        albumsListDiv.appendChild(albumElement);
    });
}

function playSong(track) {
    if (currentAudio) currentAudio.pause();

    currentAudio = new Audio(track.mp3);
    currentAudio.play();
    currentAudio.addEventListener('timeupdate', updateSeekbar);
    currentAudio.addEventListener('ended', nextTrack);

    updatePlayerUI(track);

    document.getElementById('playPauseButton').innerHTML = '<i class="fas fa-pause"></i>';

    currentlyPlaying = track;
}

function updatePlayerUI(track) {
    document.getElementById('trackImage').src = track.cover;
    document.getElementById('trackTitle').innerText = track.title;
    document.getElementById('trackArtist').innerText = track.artist;
    document.getElementById('trackAlbum').innerText = track.album || '';
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        filteredTrackList = fullTrackList.filter(track =>
            track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm)
        );
        renderTracks(filteredTrackList);
    });

    document.body.addEventListener('click', (event) => {
        const searchResultsDiv = document.getElementById('searchResults');
        const searchInput = document.getElementById('searchInput');
        if (!searchResultsDiv.contains(event.target) && event.target !== searchInput) {
            searchResultsDiv.classList.remove('show');
        }
    });
}

function renderTracks(tracks) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    tracks.forEach((track, index) => {
        const trackElement = createTrackElement(track, index);
        resultsDiv.appendChild(trackElement);
    });
    resultsDiv.classList.add('show');
}

function createTrackElement(track, index) {
    const trackElement = document.createElement('div');
    trackElement.classList.add('track');
    trackElement.innerHTML = `
        <img src=${track.cover} alt="${track.title}">
        <div class="track-details">
            <p class="track-title">${track.title}</p>
            <p class="track-artist">${track.artist}</p>
        </div>
        <button class="play-button" data-index="${index}"><i class="fas fa-play"></i></button>
    `;
    trackElement.querySelector('.play-button').addEventListener('click', () => playTrack(index, filteredTrackList));
    return trackElement;
}

function playTrack(index, trackList) {
    currentTrackIndex = index;
    playSong(trackList[index]);
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
        document.getElementById('total-time').innerText = formatTime(duration);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % currentTrackList.length;
    playTrack(currentTrackIndex, currentTrackList);
}

function previousTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + currentTrackList.length) % currentTrackList.length;
    playTrack(currentTrackIndex, currentTrackList);
}
