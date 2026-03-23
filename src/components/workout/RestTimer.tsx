import { X } from 'lucide-react';

interface RestTimerProps {
  secondsLeft: number;
  progress: number;
  isRunning: boolean;
  onSkip: () => void;
}

export function RestTimer({ secondsLeft, progress, isRunning, onSkip }: RestTimerProps) {
  if (!isRunning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-brand-dark/95 backdrop-blur-sm">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-light">Rest</span>
          <span className="text-2xl font-mono font-bold text-white">{display}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4 h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-light rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <button
          onClick={onSkip}
          className="p-2 text-gray-300 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
