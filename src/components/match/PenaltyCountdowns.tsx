import { ICONS } from './icons';

interface Side {
  items: { id: string; playerName: string; remainingMs: number }[];
  colorClass: string;
}
interface Props {
  left: Side;
  right: Side;
}

const mmss = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

function Column({ side, align }: { side: Side; align: string }) {
  return (
    <div className={`${align} ${side.colorClass}`}>
      {side.items.map((i) => (
        <div key={i.id}>
          {ICONS.card} {mmss(i.remainingMs)} - <b>{i.playerName}</b>
        </div>
      ))}
    </div>
  );
}

export function PenaltyCountdowns({ left, right }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-[5fr_2fr_5fr]">
      <Column side={left} align="text-right" />
      <div className="hidden md:block" />
      <Column side={right} align="text-left" />
    </div>
  );
}
