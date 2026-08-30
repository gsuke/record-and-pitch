import type { AudioController } from "./audio";
import { VOLUME_MIN, VOLUME_MAX } from "./audio";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function createUI(container: HTMLElement, audio: AudioController) {
  let rafId: number | null = null;

  function render() {
    const { state, audioBuffer, currentTime, duration, pitchSemiTones, volume, recordingDuration } =
      audio;
    const isRecording = state === "recording";
    const isPlaying = state === "playing";
    const isPaused = state === "paused";
    const hasRecording = audioBuffer !== null;
    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    const volumePercent = Math.round(volume * 100);
    const displayTime = isRecording ? recordingDuration : currentTime;

    container.innerHTML = `
      <div class="container">
        <h1>Record & Pitch</h1>

        <div class="record-section">
          <button id="recordBtn" class="btn btn-record ${isRecording ? "recording" : ""}"
            ${isPlaying || isPaused ? "disabled" : ""}>
            ${isRecording ? "● 録音中" : "○ 録音"}
          </button>
          <span class="timer">${formatTime(recordingDuration)}</span>
        </div>

        <div class="waveform-placeholder" id="waveform">
          <div class="bar" id="progressBar" style="width:${progress}%"></div>
        </div>

        <div class="time-display" id="timeDisplay">
          <span id="currentTime">${formatTime(displayTime)}</span>
          <span id="totalTime">${formatTime(duration)}</span>
        </div>

        <div class="controls">
          <button id="playBtn" class="btn btn-primary"
            ${!hasRecording || isRecording ? "disabled" : ""}>
            ${isPlaying ? "⏸ 一時停止" : "▶ 再生"}
          </button>
          <button id="stopBtn" class="btn"
            ${!hasRecording || (state === "idle" && !isPaused) ? "disabled" : ""}>
            ⏹ 停止
          </button>
        </div>

        <div class="volume-section">
          <label for="volumeSlider">音量: <span id="volumeValue">${volumePercent}%</span></label>
          <input type="range" id="volumeSlider" min="${VOLUME_MIN}" max="${VOLUME_MAX}" step="0.1"
            value="${volume}" ${!hasRecording || isRecording ? "disabled" : ""}/>
          <div class="volume-labels">
            <span>0%</span><span>100%</span><span>1000%</span>
          </div>
        </div>

        <div class="pitch-section">
          <label for="pitchSlider">ピッチ: <span id="pitchValue">${pitchSemiTones > 0 ? "+" : ""}${pitchSemiTones}</span></label>
          <input type="range" id="pitchSlider" min="-12" max="12" step="1"
            value="${pitchSemiTones}" ${!hasRecording || isRecording ? "disabled" : ""}/>
          <div class="pitch-labels">
            <span>-12</span><span>0</span><span>+12</span>
          </div>
        </div>
      </div>
    `;

    // Bind events only once per full render
    document.getElementById("recordBtn")!.addEventListener("click", audio.toggleRecording);
    document.getElementById("playBtn")!.addEventListener("click", audio.togglePlayPause);
    document.getElementById("stopBtn")!.addEventListener("click", audio.stop);
    document.getElementById("volumeSlider")!.addEventListener("input", (e) => {
      const vol = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById("volumeValue")!.textContent = `${Math.round(vol * 100)}%`;
      audio.setVolume(vol);
    });
    document.getElementById("pitchSlider")!.addEventListener("input", (e) => {
      const semitones = parseInt((e.target as HTMLInputElement).value);
      document.getElementById("pitchValue")!.textContent =
        semitones > 0 ? `+${semitones}` : `${semitones}`;
      audio.setPitch(semitones);
    });
    document.getElementById("waveform")!.addEventListener("click", (e) => {
      if (!audio.audioBuffer || audio.state === "recording") return;
      const rect = document.getElementById("waveform")!.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.seek(ratio * audio.duration);
    });
  }

  function updateDisplay() {
    const { state, currentTime, duration, volume, recordingDuration } = audio;
    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    const displayTime = state === "recording" ? recordingDuration : currentTime;

    const bar = document.getElementById("progressBar");
    const currentTimeEl = document.getElementById("currentTime");
    const totalTimeEl = document.getElementById("totalTime");
    const volumeValueEl = document.getElementById("volumeValue");

    if (bar) bar.style.width = `${progress}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(displayTime);
    if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);
    if (volumeValueEl) volumeValueEl.textContent = `${Math.round(volume * 100)}%`;
  }

  function startLoop() {
    if (rafId !== null) return;
    function loop() {
      if (audio.state === "playing") {
        updateDisplay();
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  audio.onStateChange = () => {
    if (audio.state === "playing") {
      startLoop();
    } else {
      stopLoop();
      render();
    }
  };
  audio.onTimeUpdate = () => {}; // RAF loop handles updates
  audio.onRecordingDurationUpdate = () => render();

  render();
}
