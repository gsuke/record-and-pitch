import { PitchShifter } from "soundtouchjs";

export type State = "idle" | "recording" | "playing" | "paused";

const MAX_RECORDING_SECONDS = 5 * 60;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 10;
export const VOLUME_DEFAULT = 5;

export interface AudioController {
  readonly state: State;
  readonly audioBuffer: AudioBuffer | null;
  readonly currentTime: number;
  readonly duration: number;
  readonly pitchSemiTones: number;
  readonly volume: number;
  readonly recordingDuration: number;
  onStateChange?: (state: State) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onRecordingDurationUpdate?: (duration: number) => void;
  toggleRecording(): void;
  togglePlayPause(): void;
  stop(): void;
  seek(time: number): void;
  setPitch(semitones: number): void;
  setVolume(volume: number): void;
}

export function createAudioController(): AudioController {
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let pitchShifter: PitchShifter | null = null;
  let gainNode: GainNode | null = null;
  let audioBuffer: AudioBuffer | null = null;
  let playbackOffset = 0;
  let pitchSemiTones = 0;
  let volume = VOLUME_DEFAULT;
  let state: State = "idle";
  let recordingTimer: number | null = null;
  let recordingDuration = 0;

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
  }

  function play(offset: number) {
    if (!audioContext || !audioBuffer) return;

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    stopPlayback();

    gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioContext.destination);

    const bufferToPlay = offset > 0 ? sliceBuffer(audioBuffer, offset) : audioBuffer;
    playbackOffset = offset;

    pitchShifter = new PitchShifter(audioContext, bufferToPlay, 2048);
    pitchShifter.on("play", () => {
      state = "playing";
      controller.onStateChange?.(state);
    });
    pitchShifter.on("end", () => {
      if (state === "playing") {
        stop();
      }
    });
    pitchShifter.on("timeupdate", () => {
      controller.onTimeUpdate?.(controller.currentTime);
    });

    pitchShifter.tempo = 1;
    pitchShifter.pitch = Math.pow(2, pitchSemiTones / 12);

    pitchShifter.connect(gainNode);
    state = "playing";
    controller.onStateChange?.(state);
  }

  function pause() {
    if (pitchShifter) {
      playbackOffset += pitchShifter.timePlayed;
      pitchShifter.disconnect();
      pitchShifter.off("play");
      pitchShifter.off("end");
      pitchShifter.off("timeupdate");
      pitchShifter = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    state = "paused";
    controller.onStateChange?.(state);
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

  function sliceBuffer(buffer: AudioBuffer, startSeconds: number): AudioBuffer {
    const startSample = Math.floor(
      Math.min(startSeconds, buffer.duration - 0.01) * buffer.sampleRate,
    );
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

  const controller: AudioController = {
    get state() {
      return state;
    },
    get audioBuffer() {
      return audioBuffer;
    },
    get currentTime() {
      if (state === "recording") return recordingDuration;
      if ((state === "playing" || state === "paused") && pitchShifter) {
        return playbackOffset + pitchShifter.timePlayed;
      }
      return 0;
    },
    get duration() {
      return audioBuffer?.duration ?? 0;
    },
    get pitchSemiTones() {
      return pitchSemiTones;
    },
    get volume() {
      return volume;
    },
    get recordingDuration() {
      return recordingDuration;
    },

    toggleRecording() {
      if (state === "recording") {
        stopRecording();
      } else {
        const chunks: Blob[] = [];
        recordingDuration = 0;
        audioBuffer = null;
        playbackOffset = 0;

        navigator.mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: true, // 便利なので有効
              autoGainControl: false, // 音質悪化の原因になるので無効
              sampleRate: 44100,
            },
          })
          .then((stream) => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunks.push(e.data);
            };
            mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
              audioContext = new AudioContext();
              const arrayBuffer = await blob.arrayBuffer();
              audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              stream.getTracks().forEach((t) => t.stop());
              state = "idle";
              controller.onStateChange?.(state);
            };
            mediaRecorder.start();
            state = "recording";
            controller.onStateChange?.(state);

            recordingTimer = window.setInterval(() => {
              recordingDuration++;
              controller.onRecordingDurationUpdate?.(recordingDuration);
              if (recordingDuration >= MAX_RECORDING_SECONDS) {
                stopRecording();
              }
            }, 1000);
          })
          .catch((err) => {
            alert("マイクへのアクセスできませんでした。");
            console.error(err);
          });
      }
    },

    togglePlayPause() {
      if (state === "playing") {
        pause();
      } else if (state === "paused") {
        const safeOffset = Math.min(playbackOffset, (audioBuffer?.duration ?? 0) - 0.01);
        play(safeOffset);
      } else {
        play(0);
      }
    },

    stop() {
      stopPlayback();
      playbackOffset = 0;
      state = "idle";
      controller.onStateChange?.(state);
    },

    seek(time: number) {
      const wasPlaying = state === "playing";
      if (wasPlaying) stopPlayback();
      setTimeout(() => play(time), 50);
    },

    setPitch(semitones: number) {
      pitchSemiTones = semitones;
      if (pitchShifter) {
        pitchShifter.pitch = Math.pow(2, semitones / 12);
      }
    },

    setVolume(v: number) {
      volume = v;
      if (gainNode) {
        gainNode.gain.value = v;
      }
    },
  };

  return controller;
}
