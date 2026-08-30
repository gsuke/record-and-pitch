import "./style.css";
import { PitchShifter } from "soundtouchjs";

type State = "idle" | "recording" | "playing" | "paused";

let state: State = "idle";
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioBuffer: AudioBuffer | null = null;
let audioContext: AudioContext | null = null;
let pitchShifter: PitchShifter | null = null;
let gainNode: GainNode | null = null;
let playbackOffset = 0; // start position in original buffer (seconds)
let pitchSemiTones = 0;
let recordingTimer: number | null = null;
let recordingDuration = 0;
const MAX_RECORDING_SECONDS = 5 * 60;

const app = document.querySelector<HTMLDivElement>("#app")!;

function render() {
  const isRecording = state === "recording";
  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const hasRecording = audioBuffer !== null;

  let currentSec = 0;
  if (isRecording) {
    currentSec = recordingDuration;
  } else if (isPlaying || isPaused) {
    if (pitchShifter) {
      currentSec = playbackOffset + pitchShifter.timePlayed;
    }
  }

  const totalSec = audioBuffer?.duration ?? 0;
  const progress = totalSec > 0 ? Math.min((currentSec / totalSec) * 100, 100) : 0;

  app.innerHTML = `
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
        <span>${formatTime(currentSec)}</span>
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

  // Event listeners
  document.getElementById("recordBtn")?.addEventListener("click", toggleRecording);
  document.getElementById("playBtn")?.addEventListener("click", togglePlayPause);
  document.getElementById("stopBtn")?.addEventListener("click", stop);
  document.getElementById("pitchSlider")?.addEventListener("input", (e) => {
    pitchSemiTones = parseInt((e.target as HTMLInputElement).value);
    document.getElementById("pitchValue")!.textContent =
      pitchSemiTones > 0 ? `+${pitchSemiTones}` : `${pitchSemiTones}`;
    if (pitchShifter) {
      pitchShifter.pitch = Math.pow(2, pitchSemiTones / 12);
    }
  });

  // Seek on waveform click
  const waveform = document.getElementById("waveform");
  waveform?.addEventListener("click", (e) => {
    if (!hasRecording || isRecording) return;
    const rect = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = ratio * (audioBuffer?.duration ?? 0);

    stopPlayback();
    // Give the old PitchShifter time to clean up its ScriptProcessor
    setTimeout(() => {
      playBuffer(seekTime);
    }, 50);
  });
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function toggleRecording() {
  if (state === "recording") {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recordingDuration = 0;

    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm;codecs=opus" });
      await decodeAudio(blob);
      stream.getTracks().forEach((t) => t.stop());
      state = "idle";
      render();
    };

    mediaRecorder.start();
    state = "recording";

    recordingTimer = window.setInterval(() => {
      recordingDuration++;
      render();
      if (recordingDuration >= MAX_RECORDING_SECONDS) {
        stopRecording();
      }
    }, 1000);

    render();
  } catch (err) {
    alert("マイクへのアクセスできませんでした。");
    console.error(err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

async function decodeAudio(blob: Blob) {
  audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
}

function togglePlayPause() {
  if (state === "playing") {
    pausePlayback();
  } else {
    playBuffer(0);
  }
}

function playBuffer(offset: number) {
  if (!audioContext || !audioBuffer) return;

  stopPlayback();

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  // Create a sliced buffer if seeking to a position
  playbackOffset = offset;
  const bufferToPlay = offset > 0 ? sliceBuffer(audioBuffer!, offset) : audioBuffer;

  gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);

  pitchShifter = new PitchShifter(audioContext, bufferToPlay, 2048);
  pitchShifter.on("play", () => {
    state = "playing";
    render();
  });
  pitchShifter.on("end", () => {
    if (state === "playing") {
      stop();
    }
  });
  pitchShifter.on("timeupdate", () => {
    render();
  });

  pitchShifter.tempo = 1;
  pitchShifter.pitch = Math.pow(2, pitchSemiTones / 12);

  pitchShifter.connect(gainNode);

  state = "playing";
  render();
}

function sliceBuffer(buffer: AudioBuffer, startSeconds: number): AudioBuffer {
  const startSample = Math.floor(startSeconds * buffer.sampleRate);
  const numSamples = buffer.length - startSample;
  const numChannels = buffer.numberOfChannels;

  const newBuffer = audioContext!.createBuffer(numChannels, numSamples, buffer.sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = buffer.getChannelData(ch);
    const destData = newBuffer.getChannelData(ch);
    destData.set(sourceData.subarray(startSample));
  }

  return newBuffer;
}

function pausePlayback() {
  if (pitchShifter) {
    pitchShifter.disconnect();
  }
  state = "paused";
  render();
}

function stopPlayback() {
  if (pitchShifter) {
    pitchShifter.off("play");
    pitchShifter.off("end");
    pitchShifter.off("timeupdate");
    pitchShifter.disconnect();
    pitchShifter = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

function stop() {
  stopPlayback();
  playbackOffset = 0;
  state = "idle";
  render();
}

render();
