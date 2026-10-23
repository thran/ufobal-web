import type { ReactNode } from 'react';
import { ICONS } from './icons';

interface Side {
  name: string;
  colorClass: string;
}
interface Props {
  left: Side;
  right: Side;
  onSwap?: () => void;
  /** Desktop-only content in an extra right column. */
  aside?: ReactNode;
}

export function TeamNames({ left, right, onSwap, aside }: Props) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${aside ? 'md:grid-cols-[5fr_2fr_3fr_2fr]' : 'md:grid-cols-[5fr_2fr_5fr]'}`}
    >
      <div title={left.name} className={`truncate text-right text-2xl font-bold ${left.colorClass}`}>
        {left.name}
      </div>
      <div className="text-center">
        {onSwap && (
          <button
            type="button"
            aria-label="Prohodit strany"
            className="min-h-11 min-w-11 cursor-pointer text-2xl"
            onClick={onSwap}
          >
            {ICONS.swap}
          </button>
        )}
      </div>
      <div title={right.name} className={`truncate text-left text-2xl font-bold ${right.colorClass}`}>
        {right.name}
      </div>
      {aside && <div className="hidden justify-end md:flex">{aside}</div>}
    </div>
  );
}
