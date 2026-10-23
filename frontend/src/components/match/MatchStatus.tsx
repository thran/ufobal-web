import { ICONS } from './icons';

interface Props {
  /** 1/2 = half, null = finished, 0 = not started. */
  phase: number | null;
  onNextPhase?: () => void;
  liveToggle?: { checked: boolean; onChange: (checked: boolean) => void };
}

export function MatchStatus({ phase, onNextPhase, liveToggle }: Props) {
  return (
    <div className="relative text-center">
      {liveToggle && (
        <label className="absolute right-0 top-0 text-sm">
          <input
            type="checkbox"
            aria-label="živě"
            checked={liveToggle.checked}
            onChange={(e) => liveToggle.onChange(e.target.checked)}
          />{' '}
          živě
        </label>
      )}
      {(phase === 1 || phase === 2) && (
        <>
          {onNextPhase ? (
            <button type="button" className="cursor-pointer" onClick={onNextPhase}>
              {phase}. poločas
            </button>
          ) : (
            <span>{phase}. poločas</span>
          )}
          {onNextPhase && (
            <button
              type="button"
              aria-label="Další poločas"
              className="ml-2 cursor-pointer"
              onClick={onNextPhase}
            >
              {ICONS.next}
            </button>
          )}
        </>
      )}
      {phase === null && <span>zápas ukončen</span>}
    </div>
  );
}
