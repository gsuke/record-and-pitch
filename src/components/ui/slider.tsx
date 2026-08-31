import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({ value, min, max, step, onValueChange, disabled, className }: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100;

  function decrement() {
    const newVal = Math.max(min, value[0] - step);
    onValueChange([newVal]);
  }

  function increment() {
    const newVal = Math.min(max, value[0] + step);
    onValueChange([newVal]);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={decrement}
        disabled={disabled || value[0] <= min}
        aria-label="減少"
      >
        −
      </Button>
      <div className="relative flex-1 h-12">
        {" "}
        {/* taller for better vertical touch target */}
        <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full bg-muted overflow-hidden">
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
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          style={{ margin: 0, height: "48px", top: "-8px" }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-background shadow-sm pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={increment}
        disabled={disabled || value[0] >= max}
        aria-label="増加"
      >
        +
      </Button>
    </div>
  );
}
