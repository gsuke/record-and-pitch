import { useSyncExternalStore } from "react";
import { useRef, useEffect } from "react";
import type { AudioController } from "./audio";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Time Display (RAF-driven DOM updates) ───────────────────
interface TimeDisplayProps {
  audio: AudioController;
}

function TimeDisplay({ audio }: TimeDisplayProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const durationTextRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function updateDOM() {
      const time = audio.currentTime;
      const dur = audio.duration;
      const progress = dur > 0 ? Math.min((time / dur) * 100, 100) : 0;
      if (progressRef.current) progressRef.current.style.width = `${progress}%`;
      if (timeTextRef.current) timeTextRef.current.textContent = formatTime(time);
      if (durationTextRef.current) durationTextRef.current.textContent = formatTime(dur);
      rafRef.current = requestAnimationFrame(updateDOM);
    }

    rafRef.current = requestAnimationFrame(updateDOM);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audio]);

  return (
    <>
      <div
        className="h-12 bg-muted rounded-lg relative overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audio.seek(ratio * audio.duration);
        }}
      >
        <div
          ref={progressRef}
          className="absolute top-0 left-0 h-full bg-primary/30"
          style={{ width: "0%" }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground font-mono tabular-nums">
        <span ref={timeTextRef}>0:00</span>
        <span ref={durationTextRef}>0:00</span>
      </div>
    </>
  );
}

// ─── Volume Control ─────────────────────────────────────────
function VolumeControl({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
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
function PitchControl({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
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
  const isPaused = state === "paused";
  const hasRecording = audioBuffer !== null;

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
        <TimeDisplay audio={audio} />

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
