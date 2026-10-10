const clamp = (v: number) => Math.min(5, Math.max(0.5, v));

/** Half-star rating slider with keyboard, click and +/- button control. */
export default function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  const step = (d: number) => onChange(clamp(value + d));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(0.5);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-0.5);
    else return;
    e.preventDefault();
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    onChange(clamp(Math.ceil(((e.clientX - rect.left) / rect.width) * 10) / 2));
  };

  return (
    <div className="flex items-center gap-2">
      {!readOnly && (
        <button
          type="button"
          className="btn btn-secondary py-0"
          aria-label="Snížit hodnocení"
          onClick={() => step(-0.5)}
        >
          −
        </button>
      )}
      <div
        role="slider"
        aria-label="Celkové hodnocení"
        aria-valuemin={0.5}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={`${value} z 5`}
        tabIndex={0}
        className="relative inline-block cursor-pointer text-3xl leading-none select-none"
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        <span className="text-gray-300">★★★★★</span>
        <span
          className="absolute top-0 left-0 overflow-hidden whitespace-nowrap text-yellow-500"
          style={{ width: `${(value / 5) * 100}%` }}
        >
          ★★★★★
        </span>
      </div>
      {!readOnly && (
        <button
          type="button"
          className="btn btn-secondary py-0"
          aria-label="Zvýšit hodnocení"
          onClick={() => step(0.5)}
        >
          +
        </button>
      )}
    </div>
  );
}
