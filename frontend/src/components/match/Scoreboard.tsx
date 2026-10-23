import type { ReactNode } from 'react';

interface Side {
  goals: number;
  shots: number;
  colorClass: string;
}
interface Props {
  left: Side;
  right: Side;
  /** Desktop-only content in an extra right column. */
  aside?: ReactNode;
}

function stats({ goals, shots }: Side) {
  const total = goals + shots;
  const pct = total === 0 ? '' : String(Math.round((goals / total) * 100));
  return `${pct}% - ${total}`;
}

export function Scoreboard({ left, right, aside }: Props) {
  return (
    <div
      className={`grid grid-cols-2 items-baseline gap-2 ${aside ? 'md:grid-cols-[5fr_2fr_3fr_2fr]' : 'md:grid-cols-[5fr_2fr_5fr]'}`}
    >
      <div className={`flex items-baseline justify-end gap-3 ${left.colorClass}`}>
        <span data-testid="stats-left">{stats(left)}</span>
        <span data-testid="goals-left" className="text-5xl font-bold">
          {left.goals}
        </span>
      </div>
      <div className="hidden md:block" />
      <div className={`flex items-baseline justify-start gap-3 ${right.colorClass}`}>
        <span data-testid="goals-right" className="text-5xl font-bold">
          {right.goals}
        </span>
        <span data-testid="stats-right">{stats(right)}</span>
      </div>
      {aside && <div className="hidden justify-end self-center md:flex">{aside}</div>}
    </div>
  );
}
