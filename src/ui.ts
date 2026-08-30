import type { AudioController } from "./audio";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function createUI(container: HTMLElement, audio: AudioController) {
  function render() {
    const { state, audioBuffer, currentTime, duration, pitchSemiTones, volume, recordingDuration } =
      audio;
    const isRecording = state === "recording";
    const isPlaying = state === "playing";
    const isPaused = state === "paused";
    const hasRecording = audioBuffer !== null;

    const displayTime = isRecording ? recordingDuration : currentTime;
    const totalSec = duration;
    const progress = totalSec > 0 ? Math.min((currentTime / totalSec) * 100, 100) : 0;
    const volumePercent = Math.round(volume * 100);

    container.innerHTML = `
      <div class="container">
        <h1>Record & Pitch</h1>

        <div class="record-section">
          <button
            id="recordBtn"
            class="btn btn-record ${isRecording ? "recording" : ""}"
            ${isPlaying || isPaused ? "disabled" : ""}
          >
            ${isRecording ? "● 録音中" : "○ 録音"}
          </button>
          <span class="timer">${formatTime(recordingDuration)}</span>
        </div>

        <div class="waveform-placeholder" id="waveform">
          <div class="bar" style="width:${progress}%"></div>
        </div>

        <div class="time-display">
          <span>${formatTime(displayTime)}</span>
          <span>${formatTime(totalSec)}</span>
        </div>

        <div class="controls">
          <button
            id="playBtn"
            class="btn btn-primary"
            ${!hasRecording || isRecording ? "disabled" : ""}
          >
            ${isPlaying ? "⏸ 一時停止" : "▶ 再生"}
          </button>
          <button
            id="stopBtn"
            class="btn"
            ${!hasRecording || (state === "idle" && !isPaused) ? "disabled" : ""}
          >
            ⏹ 停止
          </button>
        </div>

        <div class="volume-section">
          <label for="volumeSlider">音量: <span id="volumeValue">${volumePercent}%</span></label>
          <input
            type="range"
            id="volumeSlider"
            min="0"
            max="10"
            step="0.1"
            value="${volume}"
            ${!hasRecording || isRecording ? "disabled" : ""}
          />
          <div class="volume-labels">
            <span>0%</span>
            <span>100%</span>
            <span>1000%</span>
          </div>
        </div>

        <div class="pitch-section">
          <label for="pitchSlider">ピッチ: <span id="pitchValue">${pitchSemiTones > 0 ? "+" : ""}${pitchSemiTones}</span></label>
          <input
            type="range"
            id="pitchSlider"
            min="-12"
            max="12"
            step="1"
            value="${pitchSemiTones}"
            ${!hasRecording || isRecording ? "disabled" : ""}
          />
          <div class="pitch-labels">
            <span>-12</span>
            <span>0</span>
            <span>+12</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("recordBtn")?.addEventListener("click", audio.toggleRecording);
    document.getElementById("playBtn")?.addEventListener("click", audio.togglePlayPause);
    document.getElementById("stopBtn")?.addEventListener("click", audio.stop);

    document.getElementById("pitchSlider")?.addEventListener("input", (e) => {
      const semitones = parseInt((e.target as HTMLInputElement).value);
      document.getElementById("pitchValue")!.textContent =
        semitones > 0 ? `+${semitones}` : `${semitones}`;
      audio.setPitch(semitones);
    });

    document.getElementById("volumeSlider")?.addEventListener("input", (e) => {
      const vol = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById("volumeValue")!.textContent = `${Math.round(vol * 100)}%`;
      audio.setVolume(vol);
    });

    document.getElementById("waveform")?.addEventListener("click", (e) => {
      if (!hasRecording || isRecording) return;
      const waveform = document.getElementById("waveform")!;
      const rect = waveform.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekTime = ratio * duration;
      audio.seek(seekTime);
    });
  }

  audio.onStateChange = () => render();
  audio.onTimeUpdate = () => render();
  audio.onRecordingDurationUpdate = () => render();

  render();
}
