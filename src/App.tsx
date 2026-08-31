import { useSyncExternalStore } from "react";
import { useRef, useEffect } from "react";
import type { AudioController } from "./audio";
import { Slider } from "./components/ui/slider";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Waveform Canvas ────────────────────────────────────────
function computePeaks(buffer: AudioBuffer, numSamples: number): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / numSamples);
  const peaks: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    const start = blockSize * i;
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j] ?? 0);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

function drawWaveform(canvas: HTMLCanvasElement, peaks: number[], fillRatio: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const barWidth = w / peaks.length;
  const fillX = fillRatio * w;

  for (let i = 0; i < peaks.length; i++) {
    const x = i * barWidth;
    const barH = Math.max(2, peaks[i] * h * 0.9);
    const y = (h - barH) / 2;
    ctx.fillStyle = x < fillX ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.25)";
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barH);
  }
}

// ─── Play/Pause Button ───────────────────────────────────────
function PlayPauseButton({
  isPlaying,
  isDisabled,
  onClick,
}: {
  isPlaying: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg leading-none hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 shrink-0"
    >
      {isPlaying ? "❚❚" : "▶"}
    </button>
  );
}

// ─── Record Button ───────────────────────────────────────────
function RecordButton({
  isRecording,
  isDisabled,
  onToggle,
}: {
  isRecording: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isDisabled}
      className="w-14 h-14 rounded-full bg-destructive border-4 border-destructive/20 text-destructive-foreground font-bold text-lg hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-destructive/50"
    >
      {isRecording ? "■" : "●"}
    </button>
  );
}

// ─── Time Display (RAF-driven DOM updates) ───────────────────
interface TimeDisplayProps {
  audio: AudioController;
  leftControl?: React.ReactNode;
}

function TimeDisplay({ audio, leftControl }: TimeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const durationTextRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);

  // Compute peaks when audioBuffer changes
  const buffer = useSyncExternalStore(
    audio.subscribeState,
    () => audio.audioBuffer,
    () => null,
  );

  useEffect(() => {
    if (buffer) {
      const dpr = window.devicePixelRatio || 1;
      const container = containerRef.current;
      if (container) {
        const w = container.clientWidth * dpr;
        const h = container.clientHeight * dpr;
        if (canvasRef.current) {
          canvasRef.current.width = w;
          canvasRef.current.height = h;
        }
      }
      peaksRef.current = computePeaks(buffer, 120);
    } else {
      peaksRef.current = [];
    }
  }, [buffer]);

  useEffect(() => {
    function updateDOM() {
      const time = audio.currentTime;
      const dur = audio.duration;
      const progress = dur > 0 ? Math.min((time / dur) * 100, 100) / 100 : 0;
      if (progressRef.current) progressRef.current.style.width = `${progress * 100}%`;
      if (timeTextRef.current) timeTextRef.current.textContent = formatTime(time);
      if (durationTextRef.current) durationTextRef.current.textContent = formatTime(dur);
      if (canvasRef.current && peaksRef.current.length > 0) {
        drawWaveform(canvasRef.current, peaksRef.current, progress);
      }
      rafRef.current = requestAnimationFrame(updateDOM);
    }

    rafRef.current = requestAnimationFrame(updateDOM);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audio]);

  return (
    <div className="flex items-center gap-3">
      {leftControl}
      <div className="flex flex-col flex-1 gap-1">
        <div
          ref={containerRef}
          className="h-12 bg-muted rounded-lg relative overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audio.seek(ratio * audio.duration);
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div
            ref={progressRef}
            className="absolute top-0 left-0 h-full bg-primary/20"
            style={{ width: "0%" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono tabular-nums">
          <span ref={timeTextRef}>0:00</span>
          <span ref={durationTextRef}>0:00</span>
        </div>
      </div>
    </div>
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
        step={0.5}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>500%</span>
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
        <div className="flex flex-col items-center gap-2">
          <RecordButton
            isRecording={isRecording}
            isDisabled={isPlaying || isPaused}
            onToggle={() => audio.toggleRecording()}
          />
          <span className="text-sm text-muted-foreground font-mono tabular-nums">
            {formatTime(recordingDuration)}
          </span>
        </div>

        {/* Time & Progress */}
        <TimeDisplay
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
