import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import type { Account, NewPassword } from '../api/auth';
import type { User } from '../api/types';
import { useAccount, useDisconnectSocial, useRequestEmailChange } from '../auth/account';
import NewPasswordFields, { EMPTY_PASSWORD, newPasswordErrors } from '../auth/NewPasswordFields';
import { startSocialLogin, useChangePassword, useUser, type SocialProvider } from '../auth/user';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import { EMAIL_RE, FieldError, useValidation } from '../components/forms/validation';
import Spinner from '../components/Spinner';

const sectionTitle = 'mt-6 mb-2 text-xl font-bold';

export default function SettingsPage() {
  const user = useUser().data;
  const account = useAccount();
  if (!user) return null; // RequireAuth renders the page only for a logged-in user
  return (
    <div className="mx-auto max-w-md">
      <h2>Nastavení účtu</h2>
      {account.isPending ? (
        <Spinner />
      ) : account.error ? (
        <ErrorBox error={account.error} onRetry={() => void account.refetch()} />
      ) : (
        <>
          <PlayerSection user={user} />
          <EmailSection account={account.data} />
          <PasswordSection user={user} />
          <LinkedAccountsSection account={account.data} />
        </>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  onBlur,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm">
        {label}
        <input
          className="input mt-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          {...input}
        />
      </label>
      <FieldError error={error} />
    </div>
  );
}

function PlayerSection({ user }: { user: User }) {
  return (
    <section>
      <h3 className={sectionTitle}>Hráč</h3>
      {user.player ? (
        <p>
          Účet je spárovaný s hráčem <PlayerLink player={user.player} />.
        </p>
      ) : (
        <p>
          Účet zatím není spárovaný s hráčem, takže nemůžeš přihlašovat tým ani zapisovat zápasy.{' '}
          <Link to="/pair-account">Spárovat účet</Link>
        </p>
      )}
    </section>
  );
}

function EmailSection({ account }: { account: Account }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const change = useRequestEmailChange();
  const v = useValidation({
    email: (!email.trim() && 'Vyplň nový e-mail.') || (!EMAIL_RE.test(email.trim()) && 'Neplatný e-mail.'),
    password: account.has_password && !password && 'Vyplň současné heslo.',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    change.mutate({ email: email.trim(), ...(account.has_password ? { password } : {}) });
  };

  return (
    <section>
      <h3 className={sectionTitle}>E-mail</h3>
      <p className="text-sm">
        Současný: <b>{account.email || 'žádný'}</b>. Přihlásit se můžeš e-mailem nebo jménem{' '}
        <b>{account.username}</b>; na e-mail přijde i odkaz pro obnovení hesla.
      </p>
      {change.isSuccess ? (
        <p role="status" className="mt-2">
          Na {change.variables.email} jsme poslali odkaz. E-mail se změní, až ho otevřeš (platí 24 hodin).
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-2 flex flex-col gap-3">
          <TextField
            label="Nový e-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onBlur={v.touch('email')}
            error={v.error('email')}
          />
          {account.has_password && (
            <TextField
              label="Současné heslo"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              onBlur={v.touch('password')}
              error={v.error('password')}
            />
          )}
          <button type="submit" className="btn self-start" disabled={change.isPending}>
            Poslat potvrzovací odkaz
          </button>
        </form>
      )}
    </section>
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
      <h3 className={sectionTitle}>{user.has_password ? 'Změna hesla' : 'Heslo'}</h3>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        {user.has_password ? (
          <TextField
            label="Současné heslo"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={setOldPassword}
            onBlur={v.touch('old_password')}
            error={v.error('old_password')}
          />
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

const PROVIDERS: { provider: SocialProvider; name: string }[] = [
  { provider: 'google-oauth2', name: 'Google' },
  { provider: 'facebook', name: 'Facebook' },
];

function LinkedAccountsSection({ account }: { account: Account }) {
  const disconnect = useDisconnectSocial();
  return (
    <section>
      <h3 className={sectionTitle}>Propojené účty</h3>
      <p className="text-sm">Přes propojený účet se můžeš přihlásit místo hesla.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {PROVIDERS.map(({ provider, name }) => {
          const logins = account.social.filter((s) => s.provider === provider);
          return (
            <li key={provider} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <b className="w-20">{name}</b>
              {logins.length === 0 ? (
                <>
                  <span className="text-sm">nepropojeno</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => startSocialLogin(provider, '/settings')}
                  >
                    Propojit {name}
                  </button>
                </>
              ) : (
                logins.map((login) => (
                  <span key={login.id} className="flex items-center gap-3">
                    <span className="text-sm">{provider === 'google-oauth2' ? login.uid : 'propojeno'}</span>
                    <button
                      type="button"
                      className="btn"
                      disabled={disconnect.isPending}
                      onClick={() =>
                        disconnect.mutate(login.id, { onSuccess: () => toast.success(`${name} odpojen.`) })
                      }
                    >
                      Odpojit {name}
                    </button>
                  </span>
                ))
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
