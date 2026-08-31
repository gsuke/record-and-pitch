export function RecordButton({
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
