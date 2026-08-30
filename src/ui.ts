import type { AudioController } from "./audio";
import { VOLUME_MIN, VOLUME_MAX } from "./audio";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Component types
interface UIState {
  state: "idle" | "recording" | "playing" | "paused";
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  currentTime: number;
  duration: number;
  pitchSemiTones: number;
  volume: number;
  recordingDuration: number;
  progress: number;
  displayTime: number;
  volumePercent: number;
}

function Header(): string {
  return `<h1>Record & Pitch</h1>`;
}

function RecordSection(state: UIState): string {
  return `
    <div class="record-section">
      <button
        id="recordBtn"
        class="btn btn-record ${state.isRecording ? "recording" : ""}"
        ${state.isPlaying || state.isPaused ? "disabled" : ""}
      >
        ${state.isRecording ? "● 録音中" : "○ 録音"}
      </button>
      <span class="timer">${formatTime(state.recordingDuration)}</span>
    </div>
  `;
}

function WaveformBar(state: UIState): string {
  return `
    <div class="waveform-placeholder" id="waveform">
      <div class="bar" style="width:${state.progress}%"></div>
    </div>
  `;
}

function TimeDisplay(state: UIState): string {
  return `
    <div class="time-display">
      <span>${formatTime(state.displayTime)}</span>
      <span>${formatTime(state.duration)}</span>
    </div>
  `;
}

function Controls(state: UIState): string {
  const playLabel = state.isPlaying ? "⏸ 一時停止" : "▶ 再生";
  const stopDisabled = !state.hasRecording || (state.state === "idle" && !state.isPaused);

  return `
    <div class="controls">
      <button
        id="playBtn"
        class="btn btn-primary"
        ${!state.hasRecording || state.isRecording ? "disabled" : ""}
      >
        ${playLabel}
      </button>
      <button
        id="stopBtn"
        class="btn"
        ${stopDisabled ? "disabled" : ""}
      >
        ⏹ 停止
      </button>
    </div>
  `;
}

function SliderSection(
  id: string,
  label: string,
  value: number,
  displayValue: string,
  min: string,
  max: string,
  step: string,
  disabled: boolean,
  labels: [string, string, string],
): string {
  return `
    <div class="pitch-section">
      <label for="${id}Slider">${label}: <span id="${id}Value">${displayValue}</span></label>
      <input
        type="range"
        id="${id}Slider"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${value}"
        ${disabled ? "disabled" : ""}
      />
      <div class="pitch-labels">
        <span>${labels[0]}</span>
        <span>${labels[1]}</span>
        <span>${labels[2]}</span>
      </div>
    </div>
  `;
}

function VolumeSlider(state: UIState): string {
  return SliderSection(
    "volume",
    "音量",
    state.volume,
    `${state.volumePercent}%`,
    String(VOLUME_MIN),
    String(VOLUME_MAX),
    "0.1",
    !state.hasRecording || state.isRecording,
    ["0%", "100%", "1000%"],
  );
}

function PitchSlider(state: UIState): string {
  const displayValue =
    state.pitchSemiTones > 0 ? `+${state.pitchSemiTones}` : `${state.pitchSemiTones}`;
  return SliderSection(
    "pitch",
    "ピッチ",
    state.pitchSemiTones,
    displayValue,
    "-12",
    "12",
    "1",
    !state.hasRecording || state.isRecording,
    ["-12", "0", "+12"],
  );
}

function AppContainer(children: string): string {
  return `<div class="container">${children}</div>`;
}

export function createUI(container: HTMLElement, audio: AudioController) {
  function getState(): UIState {
    const { state, audioBuffer, currentTime, duration, pitchSemiTones, volume, recordingDuration } =
      audio;
    const isRecording = state === "recording";
    const isPlaying = state === "playing";
    const isPaused = state === "paused";
    const hasRecording = audioBuffer !== null;

    const displayTime = isRecording ? recordingDuration : currentTime;
    const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    const volumePercent = Math.round(volume * 100);

    return {
      state,
      isRecording,
      isPlaying,
      isPaused,
      hasRecording,
      currentTime,
      duration,
      pitchSemiTones,
      volume,
      recordingDuration,
      progress,
      displayTime,
      volumePercent,
    };
  }

  function render() {
    const s = getState();

    const html = AppContainer(
      [
        Header(),
        RecordSection(s),
        WaveformBar(s),
        TimeDisplay(s),
        Controls(s),
        VolumeSlider(s),
        PitchSlider(s),
      ].join(""),
    );

    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    document.getElementById("recordBtn")?.addEventListener("click", audio.toggleRecording);
    document.getElementById("playBtn")?.addEventListener("click", audio.togglePlayPause);
    document.getElementById("stopBtn")?.addEventListener("click", audio.stop);

    document.getElementById("volumeSlider")?.addEventListener("input", (e) => {
      const vol = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById("volumeValue")!.textContent = `${Math.round(vol * 100)}%`;
      audio.setVolume(vol);
    });

    document.getElementById("pitchSlider")?.addEventListener("input", (e) => {
      const semitones = parseInt((e.target as HTMLInputElement).value);
      document.getElementById("pitchValue")!.textContent =
        semitones > 0 ? `+${semitones}` : `${semitones}`;
      audio.setPitch(semitones);
    });

    document.getElementById("waveform")?.addEventListener("click", (e) => {
      const { audioBuffer } = audio;
      if (!audioBuffer || audio.state === "recording") return;
      const waveform = document.getElementById("waveform")!;
      const rect = waveform.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekTime = ratio * audio.duration;
      audio.seek(seekTime);
    });
  }

  function updateTimeDisplay() {
    const { currentTime, duration } = audio;
    const timeDisplay = document.querySelector(".time-display");
    const bar = document.querySelector(".bar") as HTMLElement;
    if (timeDisplay) {
      const spans = timeDisplay.querySelectorAll("span");
      spans[0].textContent = formatTime(currentTime);
      spans[1].textContent = formatTime(duration);
    }
    if (bar) {
      const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
      bar.style.width = `${progress}%`;
    }
  }

  audio.onStateChange = () => render();
  audio.onTimeUpdate = () => updateTimeDisplay();
  audio.onRecordingDurationUpdate = () => render();

  render();
}
