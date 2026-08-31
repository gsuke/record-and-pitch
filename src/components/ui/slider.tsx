import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled,
  className,
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
        <div
          className="absolute h-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([Number(e.target.value)])}
        disabled={disabled}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      />
      <div
        className="absolute h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}
