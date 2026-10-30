import type { NewPassword } from '../api/auth';
import { FieldError } from '../components/forms/validation';

export const EMPTY_PASSWORD: NewPassword = { password: '', password_check: '' };

// the server checks more (common and too similar passwords); these are the ones worth catching while typing
export const newPasswordErrors = (p: NewPassword) => ({
  password: (!p.password && 'Vyplň heslo.') || (p.password.length < 8 && 'Heslo musí mít aspoň 8 znaků.'),
  password_check: p.password !== p.password_check && 'Hesla se liší.',
});

export default function NewPasswordFields({
  value,
  onChange,
  error,
  touch,
}: {
  value: NewPassword;
  onChange: (value: NewPassword) => void;
  error: (k: keyof NewPassword) => string | undefined;
  touch: (k: keyof NewPassword) => () => void;
}) {
  const fields: { key: keyof NewPassword; label: string }[] = [
    { key: 'password', label: 'Nové heslo' },
    { key: 'password_check', label: 'Nové heslo znovu' },
  ];
  return fields.map((f) => (
    <div key={f.key}>
      <label className="block text-sm">
        {f.label}
        <input
          className="input mt-1"
          type="password"
          autoComplete="new-password"
          value={value[f.key]}
          onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          onBlur={touch(f.key)}
          aria-invalid={!!error(f.key)}
        />
      </label>
      <FieldError error={error(f.key)} />
    </div>
  ));
}
