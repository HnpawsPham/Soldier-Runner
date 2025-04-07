const backgroundMusic = new Audio();
let currentTrack = 1;
const totalTracks = 3; 
let isPlaying = false;

const winSound = new Audio('./assets/audios/win.mp3');
const loseSound = new Audio('./assets/audios/lose.mp3');

let audioContextStarted = false;

function randomizeMusic() {
    const randomTrack = Math.floor(Math.random() * totalTracks) + 1;
    currentTrack = randomTrack;
    
    backgroundMusic.src = `./assets/audios/${currentTrack}.mp3`;
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5; 
}

function playMusic() {
    if (!isPlaying && audioContextStarted) {
        backgroundMusic.play()
            .then(() => {
                isPlaying = true;
            })
            .catch(error => {
                console.error("Error playing music:", error);
            });
    }
}

function pauseMusic() {
    if (isPlaying) {
        backgroundMusic.pause();
        isPlaying = false;
    }
}

function restartWithNewTrack() {
    pauseMusic();
    randomizeMusic();
    playMusic();
}

function playWinSound() {
    pauseMusic();
    
    if (audioContextStarted) {
        winSound.currentTime = 0; 
        winSound.play()
            .catch(error => {
                console.error("Error playing win sound:", error);
            });
    }
}

function playLoseSound() {
    pauseMusic();
    
    if (audioContextStarted) {
        loseSound.currentTime = 0; 
        loseSound.play()
            .catch(error => {
                console.error("Error playing lose sound:", error);
            });
    }
}

function stopAllSounds() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    winSound.pause();
    winSound.currentTime = 0;
    loseSound.pause();
    loseSound.currentTime = 0;
}

function initAudio() {
    audioContextStarted = true;
    // Pre-load sounds
    backgroundMusic.load();
    winSound.load();
    loseSound.load();
}

export { 
    playMusic, 
    pauseMusic, 
    restartWithNewTrack, 
    playWinSound, 
    playLoseSound, 
    backgroundMusic,
    stopAllSounds,
    initAudio  
};