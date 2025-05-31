let audio;
let isPlaying = false;
//console.log("Audio script loaded");
function toggleMusic() {
  if (!audio) {
    audio = new Audio("./assets/music/vibecoding1.mp3"); // remplace avec le chemin de ton fichier audio
    audio.loop = true;
  }

  if (!isPlaying) {
    audio.play();
    isPlaying = true;
    document.getElementById("playMusicButton").textContent = "Mute Music";
  } else {
    if (audio.muted) {
      audio.muted = false;
      document.getElementById("playMusicButton").textContent = "Mute Music";
    } else {
      audio.muted = true;
      document.getElementById("playMusicButton").textContent = "Unmute Music";
    }
  }
}
