import { computeAge } from '../../domain/age';

/** Birthdate picker with a read-only computed age next to it. */
export default function BirthdateAgeInput({
  value,
  onChange,
  idPrefix,
}: {
  value: string;
  onChange: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <label htmlFor={`${idPrefix}-birthdate`}>Datum narození</label>
        <input
          id={`${idPrefix}-birthdate`}
          type="date"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="w-24">
        <label htmlFor={`${idPrefix}-age`}>Věk</label>
        <input id={`${idPrefix}-age`} className="input" disabled value={computeAge(value) ?? ''} readOnly />
      </div>
    </div>
  );
}
