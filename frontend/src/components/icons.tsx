const svgProps = {
  viewBox: '0 0 24 24',
  className: 'size-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function TrashIcon() {
  return (
    <svg {...svgProps}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg {...svgProps}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function CrossIcon() {
  return (
    <svg {...svgProps}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...svgProps}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}
