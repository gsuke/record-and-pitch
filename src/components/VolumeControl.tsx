import { Slider } from "./ui/slider";

export function VolumeControl({
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
