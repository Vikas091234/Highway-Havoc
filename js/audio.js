// audio.js - Audio management for Highway Havoc
// Controls music playback and volume for the game

const tracks = ['audio/drive.mp3', 'audio/sixdays.mp3'];
let currentTrackIndex = 0;
const audio = new Audio(tracks[currentTrackIndex]);
audio.loop = false;

const audioControl = {
  play: () => {
    audio.play().catch(e => console.error('Audio play error:', e));
  },
  pause: () => {
    audio.pause();
  },
  skip: () => {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    audio.src = tracks[currentTrackIndex];
    audio.play().catch(e => console.error('Audio skip error:', e));
  },
  setVolume: (value) => {
    audio.volume = Math.max(0, Math.min(1, value));
  }
};

audio.addEventListener('ended', () => {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  audio.src = tracks[currentTrackIndex];
  audio.play().catch(e => console.error('Audio ended play error:', e));
});

// Initialize audio controls on page load
document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('gPlay');
  const pauseButton = document.getElementById('gPause');
  const skipButton = document.getElementById('gNext');
  const volumeSlider = document.getElementById('volumeSlider');

  if (playButton) {
    playButton.addEventListener('click', () => audioControl.play());
  }
  if (pauseButton) {
    pauseButton.addEventListener('click', () => audioControl.pause());
  }
  if (skipButton) {
    skipButton.addEventListener('click', () => audioControl.skip());
  }
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audioControl.setVolume(e.target.value);
    });
    // Set initial volume
    audioControl.setVolume(volumeSlider.value);
  }
});

// Expose audio control globally
window.audioControl = audioControl;
