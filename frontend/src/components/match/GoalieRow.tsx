interface Side {
  team: number;
  goalieName: string | null;
  colorClass: string;
}
interface Props {
  left: Side;
  right: Side;
  onChange?: (team: number) => void;
}

function Cell({ side, onChange, align }: { side: Side; onChange?: (team: number) => void; align: string }) {
  const label = <b>{side.goalieName ?? 'bez brankáře'}</b>;
  return (
    <div className={`${align} ${side.colorClass}`}>
      {onChange ? (
        <button type="button" className="cursor-pointer" onClick={() => onChange(side.team)}>
          {label}
        </button>
      ) : (
        label
      )}
    </div>
  );
}

export function GoalieRow({ left, right, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-[5fr_2fr_5fr]">
      <Cell side={left} onChange={onChange} align="text-right" />
      <div className="hidden md:block" />
      <Cell side={right} onChange={onChange} align="text-left" />
    </div>
  );
}
