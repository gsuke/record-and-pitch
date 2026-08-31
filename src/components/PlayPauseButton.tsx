export function PlayPauseButton({
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
