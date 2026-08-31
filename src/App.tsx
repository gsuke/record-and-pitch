import { useSyncExternalStore } from "react";
import type { AudioController } from "./audio";
import { RecordButton } from "./components/RecordButton";
import { PlayPauseButton } from "./components/PlayPauseButton";
import { WaveformDisplay, formatTime } from "./components/Waveform";
import { VolumeControl } from "./components/VolumeControl";
import { PitchControl } from "./components/PitchControl";

interface AppProps {
  audio: AudioController;
}

export function App({ audio }: AppProps) {
  const state = useSyncExternalStore(
    audio.subscribeState,
    () => audio.state,
    () => "idle",
  );
  const pitch = useSyncExternalStore(
    audio.subscribeState,
    () => audio.pitchSemiTones,
    () => 0,
  );
  const volume = useSyncExternalStore(
    audio.subscribeState,
    () => audio.volume,
    () => audio.volume,
  );
  const recordingDuration = useSyncExternalStore(
    audio.subscribeState,
    () => audio.recordingDuration,
    () => 0,
  );
  const audioBuffer = useSyncExternalStore(
    audio.subscribeState,
    () => audio.audioBuffer,
    () => null,
  );

  const isRecording = state === "recording";
  const isPlaying = state === "playing";
  const hasRecording = audioBuffer !== null;

  return (
    <div className="min-h-svh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-foreground">Record & Pitch</h1>

        {/* Record */}
        <div className="flex flex-col items-center gap-2">
          <RecordButton
            isRecording={isRecording}
            isDisabled={isPlaying}
            onToggle={() => audio.toggleRecording()}
          />
          <span className="text-sm text-muted-foreground font-mono tabular-nums">
            {formatTime(recordingDuration)}
          </span>
        </div>

        {/* Waveform & Play */}
        <WaveformDisplay
          audio={audio}
          leftControl={
            <PlayPauseButton
              isPlaying={isPlaying}
              isDisabled={!hasRecording || isRecording}
              onClick={() => (isPlaying ? audio.stop() : audio.togglePlayPause())}
            />
          }
        />

        {/* Volume */}
        <VolumeControl
          value={volume}
          disabled={!hasRecording || isRecording}
          onChange={(v) => audio.setVolume(v)}
        />

        {/* Pitch */}
        <PitchControl
          value={pitch}
          disabled={!hasRecording || isRecording}
          onChange={(v) => audio.setPitch(v)}
        />
      </div>
    </div>
  );
}
