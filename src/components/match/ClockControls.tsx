import { formatClock } from '../../domain/time';
import { ICONS } from './icons';

interface Props {
  remainingMs: number;
  running: boolean;
  phase: number | null;
  onToggle: () => void;
  onAdjust: (deltaMs: number) => void;
}

const stepClass =
  'flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center px-1 text-base leading-tight';

export function ClockControls({ remainingMs, running, phase, onToggle, onAdjust }: Props) {
  const { text, negative } = formatClock(remainingMs);
  const highlight = phase === 0 ? 'pressbutton' : '';
  const step = (icon: string, label: string, aria: string, delta: number) => (
    <button type="button" className={stepClass} aria-label={aria} onClick={() => onAdjust(delta)}>
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
  return (
    <div className="flex select-none flex-wrap items-center justify-center text-4xl sm:text-5xl">
      {step(ICONS.rewind, '+5 s', 'Přidat 5 s', 5000)}
      {step(ICONS.back1, '+1 s', 'Přidat 1 s', 1000)}
      {/* Below sm the clock takes its own row so the four step buttons stay together on the next one. */}
      <span
        className={`order-first flex w-full items-center justify-center sm:order-none sm:w-auto ${highlight}`}
      >
        <button
          type="button"
          className="mr-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-2xl"
          aria-label={running ? 'Zastavit čas' : 'Spustit čas'}
          onClick={onToggle}
        >
          {running ? ICONS.pause : ICONS.play}
        </button>
        <button
          type="button"
          aria-label="Čas zápasu"
          className={`cursor-pointer font-mono ${negative ? 'text-alert' : ''}`}
          onClick={onToggle}
        >
          {text}
        </button>
      </span>
      {step(ICONS.fwd1, '−1 s', 'Ubrat 1 s', -1000)}
      {step(ICONS.fastForward, '−5 s', 'Ubrat 5 s', -5000)}
    </div>
  );
}
