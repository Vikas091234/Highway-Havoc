// audio.js

const tracks = ['drive.mp3', 'sixdays.mp3'];
let currentTrackIndex = 0;
const audioPlayer = new Audio(tracks[currentTrackIndex]);

audioPlayer.volume = 0.5; // Adjust volume as needed

// Loop to next track when current one ends
audioPlayer.addEventListener('ended', () => {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  audioPlayer.src = tracks[currentTrackIndex];
  audioPlayer.play();
});

// Optional: Expose control for other scripts
window.audioControl = {
  play: () => audioPlayer.play(),
  pause: () => audioPlayer.pause(),
  skip: () => {
    audioPlayer.pause();
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    audioPlayer.src = tracks[currentTrackIndex];
    audioPlayer.play();
  },
  getCurrentTrack: () => tracks[currentTrackIndex],
  setVolume: (v) => audioPlayer.volume = v
};
