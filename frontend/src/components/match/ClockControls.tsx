import { formatClock } from '../../domain/time';
import { ICONS } from './icons';

interface Props {
  remainingMs: number;
  running: boolean;
  phase: number | null;
  onToggle: () => void;
  onAdjust: (deltaMs: number) => void;
}

const stepClass = 'flex min-h-11 cursor-pointer items-center justify-center px-1.5';

// Shapes of the old clock: Foundation fi-rewind / fi-fast-forward and plain triangles for 1 s.
const STEP_SHAPES = {
  double: { viewBox: '0 0 40 24', className: 'h-[21px] w-auto', points: ['20,0 20,24 0,12', '40,0 40,24 20,12'] },
  single: { viewBox: '0 0 20 24', className: 'h-[18px] w-auto', points: ['20,0 20,24 0,12'] },
};

function StepIcon({ shape, forward }: { shape: keyof typeof STEP_SHAPES; forward: boolean }) {
  const { viewBox, className, points } = STEP_SHAPES[shape];
  return (
    <svg
      viewBox={viewBox}
      className={`${className} fill-current ${forward ? '-scale-x-100' : ''}`}
      aria-hidden
    >
      {points.map((p) => (
        <polygon key={p} points={p} />
      ))}
    </svg>
  );
}

export function ClockControls({ remainingMs, running, phase, onToggle, onAdjust }: Props) {
  const { text, negative } = formatClock(remainingMs);
  const highlight = phase === 0 ? 'pressbutton' : '';
  const step = (aria: string, delta: number, order: string) => (
    <button
      type="button"
      className={`${stepClass} ${order}`}
      aria-label={aria}
      onClick={() => onAdjust(delta)}
    >
      <StepIcon shape={Math.abs(delta) > 1000 ? 'double' : 'single'} forward={delta < 0} />
    </button>
  );
  return (
    <div className="flex select-none flex-wrap items-center justify-center text-4xl sm:text-5xl">
      {/* First in the DOM; below sm it takes its own row, from sm up it sits between the step buttons via order-*. */}
      <span className={`flex w-full items-center justify-center sm:order-3 sm:mx-3 sm:w-auto ${highlight}`}>
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
      {step('Přidat 5 s', 5000, 'sm:order-1')}
      {step('Přidat 1 s', 1000, 'sm:order-2')}
      {step('Ubrat 1 s', -1000, 'sm:order-4')}
      {step('Ubrat 5 s', -5000, 'sm:order-5')}
    </div>
  );
}
