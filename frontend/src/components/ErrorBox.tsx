export default function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error && error.message ? error.message : 'Nepodařilo se načíst data.';
  return (
    <div role="alert" className="callout callout-alert my-4 flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary py-1" onClick={onRetry}>
          Zkusit znovu
        </button>
      )}
    </div>
  );
}
