interface Props {
  pending: number;
  errors: number;
  offline: boolean;
  patchError?: string | null;
  onRetryPatch?: () => void;
}

export function SyncStatus({ pending, errors, offline, patchError, onRetryPatch }: Props) {
  const parts: { text: string; className: string }[] = [];
  if (offline) parts.push({ text: `Offline – čeká ${pending}`, className: 'text-warning' });
  else if (pending > 0) parts.push({ text: `Neuloženo: ${pending}`, className: 'text-warning' });
  if (errors > 0) parts.push({ text: `Chyby: ${errors}`, className: 'text-alert' });
  if (parts.length === 0) parts.push({ text: 'Vše uloženo', className: 'text-success' });
  return (
    <div className="text-center text-sm">
      <div role="status" aria-live="polite">
        {parts.map((p) => (
          <span key={p.text} className={`mx-2 ${p.className}`}>
            {p.text}
          </span>
        ))}
      </div>
      {patchError && (
        <div role="alert" className="text-alert">
          Uložení zápasu selhalo: {patchError}{' '}
          <button type="button" className="btn btn-alert px-2 py-1" onClick={onRetryPatch}>
            Zkusit znovu
          </button>
        </div>
      )}
    </div>
  );
}
