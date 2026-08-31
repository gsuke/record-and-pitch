import { Slider } from "./ui/slider";

export function PitchControl({
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
