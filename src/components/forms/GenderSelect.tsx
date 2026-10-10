type Gender = 'man' | 'woman' | null;

/** Gender dropdown with an empty option mapped to null. */
export default function GenderSelect({
  value,
  onChange,
  id,
}: {
  value: Gender;
  onChange: (v: Gender) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as 'man' | 'woman'))}
    >
      <option value="">----</option>
      <option value="man">muž</option>
      <option value="woman">žena</option>
    </select>
  );
}
