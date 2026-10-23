interface Props {
  players: { pk: number; nickname: string }[];
  onPick: (pk: number) => void;
  /** Player rendered as an empty placeholder (e.g. the shooter when picking an assist). */
  hiddenPk?: number | null;
  extra?: { label: string; onClick: () => void }[];
}

export function PlayerTiles({ players, onPick, hiddenPk, extra }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3">
      {players.map((p) =>
        p.pk === hiddenPk ? (
          <div key={p.pk} data-testid="tile-placeholder" />
        ) : (
          <button key={p.pk} type="button" className="pressbutton" onClick={() => onPick(p.pk)}>
            {p.nickname}
          </button>
        ),
      )}
      {extra?.map((x) => (
        <button key={x.label} type="button" className="pressbutton pressbutton-red" onClick={x.onClick}>
          {x.label}
        </button>
      ))}
    </div>
  );
}
