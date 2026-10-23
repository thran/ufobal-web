export default function Spinner() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <span className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      Načítám…
    </div>
  );
}
