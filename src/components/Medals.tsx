const BADGE = ['bg-medal-gold', 'bg-medal-silver', 'bg-medal-bronze', '', ''];

export default function Medals({ medals }: { medals: number[] }) {
  return (
    <span className="inline-flex flex-wrap gap-2">
      {medals.map((count, i) =>
        count > 0 ? (
          <span key={i} className="whitespace-nowrap">
            {count}×
            <span
              title={`${i + 1}. místo`}
              className={`ml-0.5 inline-flex size-4 items-center justify-center rounded-full border border-gray-400 align-middle text-[0.6em] text-gray-600 ${BADGE[i]}`}
            >
              {i + 1}
            </span>
          </span>
        ) : null,
      )}
    </span>
  );
}
