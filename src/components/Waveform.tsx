import { useSyncExternalStore } from "react";
import { useRef, useEffect } from "react";
import type { AudioController } from "../audio";

export function computePeaks(buffer: AudioBuffer, numSamples: number): number[] {
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

export function drawWaveform(canvas: HTMLCanvasElement, peaks: number[], fillRatio: number) {
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

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface WaveformDisplayProps {
  audio: AudioController;
  leftControl?: React.ReactNode;
}

export function WaveformDisplay({ audio, leftControl }: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const durationTextRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);

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
      const progress = dur > 0 ? Math.min(time / dur, 1) : 0;
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
