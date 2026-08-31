import { useState, useEffect, useCallback } from "react";
import type { AudioController } from "./audio";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Time Display ────────────────────────────────────────────
interface TimeDisplayProps {
  audio: AudioController;
  duration: number;
}

function TimeDisplay({ audio, duration }: TimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let rafId: number;
    let lastUpdate = 0;

    function loop() {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastUpdate > 50) {
        lastUpdate = now;
        setCurrentTime(audio.currentTime);
      }
    }

    if (audio.state === "playing") {
      rafId = requestAnimationFrame(loop);
    } else {
      setCurrentTime(audio.state === "recording" ? audio.recordingDuration : audio.currentTime);
    }

    return () => cancelAnimationFrame(rafId);
  }, [audio, audio.state]);

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <>
      <div
        className="h-12 bg-muted rounded-lg relative overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!audio.audioBuffer || audio.state === "recording") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audio.seek(ratio * duration);
        }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-primary/30 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground font-mono tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </>
  );
}

// ─── Volume Control ─────────────────────────────────────────
interface VolumeControlProps {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function VolumeControl({ value, disabled, onChange }: VolumeControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">音量</span>
        <span className="font-mono tabular-nums text-foreground">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={10}
        step={0.1}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
        <span>1000%</span>
      </div>
    </div>
  );
}

// ─── Pitch Control ──────────────────────────────────────────
interface PitchControlProps {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function PitchControl({ value, disabled, onChange }: PitchControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">ピッチ</span>
        <span className="font-mono tabular-nums text-foreground">
          {value > 0 ? "+" : ""}
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={-12}
        max={12}
        step={1}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-12</span>
        <span>0</span>
        <span>+12</span>
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────
interface AppProps {
  audio: AudioController;
}

export function App({ audio }: AppProps) {
  const [state, setState] = useState(audio.state);
  const [duration, setDuration] = useState(audio.duration);
  const [pitch, setPitch] = useState(audio.pitchSemiTones);
  const [volume, setVolume] = useState(audio.volume);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const isRecording = state === "recording";
  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const hasRecording = audio.audioBuffer !== null;

  useEffect(() => {
    audio.onStateChange = (s) => setState(s);
    audio.onTimeUpdate = () => {};
    audio.onRecordingDurationUpdate = (d) => setRecordingDuration(d);
  }, [audio]);

  useEffect(() => {
    setDuration(audio.duration);
    setPitch(audio.pitchSemiTones);
    setVolume(audio.volume);
  }, [audio]);

  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
      audio.setVolume(v);
    },
    [audio],
  );

  const handlePitchChange = useCallback(
    (v: number) => {
      setPitch(v);
      audio.setPitch(v);
    },
    [audio],
  );

  return (
    <div className="min-h-svh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-foreground">Record & Pitch</h1>

        {/* Record */}
        <div className="flex items-center gap-4">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            onClick={() => audio.toggleRecording()}
            disabled={isPlaying || isPaused}
            className="min-w-28"
          >
            {isRecording ? "● 録音中" : "○ 録音"}
          </Button>
          <span className="text-sm text-muted-foreground font-mono tabular-nums">
            {formatTime(recordingDuration)}
          </span>
        </div>

        {/* Time & Progress */}
        <TimeDisplay audio={audio} duration={duration} />

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="default"
            onClick={() => audio.togglePlayPause()}
            disabled={!hasRecording || isRecording}
            className="min-w-28"
          >
            {isPlaying ? "⏸ 一時停止" : "▶ 再生"}
          </Button>
          <Button
            variant="outline"
            onClick={() => audio.stop()}
            disabled={!hasRecording || (state === "idle" && !isPaused)}
          >
            ⏹ 停止
          </Button>
        </div>

        {/* Volume */}
        <VolumeControl
          value={volume}
          disabled={!hasRecording || isRecording}
          onChange={handleVolumeChange}
        />

        {/* Pitch */}
        <PitchControl
          value={pitch}
          disabled={!hasRecording || isRecording}
          onChange={handlePitchChange}
        />
      </div>
    </div>
  );
}
