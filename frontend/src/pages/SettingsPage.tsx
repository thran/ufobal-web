import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { NewPassword } from '../api/auth';
import type { User } from '../api/types';
import NewPasswordFields, { EMPTY_PASSWORD, newPasswordErrors } from '../auth/NewPasswordFields';
import { useChangePassword, useUser } from '../auth/user';
import { FieldError, useValidation } from '../components/forms/validation';

export default function SettingsPage() {
  const user = useUser().data;
  if (!user) return null; // RequireAuth renders the page only for a logged-in user
  return (
    <div className="mx-auto max-w-md">
      <h2>Nastavení účtu</h2>
      <PasswordSection user={user} />
    </div>
  );
}

function PasswordSection({ user }: { user: User }) {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState<NewPassword>(EMPTY_PASSWORD);
  const change = useChangePassword();
  const v = useValidation({
    ...newPasswordErrors(password),
    old_password: user.has_password && !oldPassword && 'Vyplň současné heslo.',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    change.mutate(
      { ...password, ...(user.has_password ? { old_password: oldPassword } : {}) },
      {
        onSuccess: () => {
          toast.success(user.has_password ? 'Heslo změněno.' : 'Heslo nastaveno.');
          setOldPassword('');
          setPassword(EMPTY_PASSWORD);
          v.reset();
        },
      },
    );
  };

  return (
    <section>
      <h3>{user.has_password ? 'Změna hesla' : 'Heslo'}</h3>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        {user.has_password ? (
          <div>
            <label className="block text-sm">
              Současné heslo
              <input
                className="input mt-1"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                onBlur={v.touch('old_password')}
                aria-invalid={!!v.error('old_password')}
              />
            </label>
            <FieldError error={v.error('old_password')} />
          </div>
        ) : (
          <p className="text-sm">
            Účet zatím nemá heslo, přihlašuješ se přes Google nebo Facebook. Když si heslo nastavíš, můžeš se
            přihlásit i jménem nebo e-mailem.
          </p>
        )}
        <NewPasswordFields value={password} onChange={setPassword} error={v.error} touch={v.touch} />
        <button type="submit" className="btn self-start" disabled={change.isPending}>
          {user.has_password ? 'Změnit heslo' : 'Nastavit heslo'}
        </button>
      </form>
    </section>
  );
}
