import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { EMAIL_RE, FieldError, useValidation } from '../components/forms/validation';
import Modal from '../components/Modal';
import { useLogin, useRequestPasswordReset, useResendVerification } from './user';

export default function LoginDialog({
  open,
  onClose,
  forgotten = false,
}: {
  open: boolean;
  onClose: () => void;
  /** opens straight on the "forgotten password" form */
  forgotten?: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'forgotten'>(forgotten ? 'forgotten' : 'login');
  return (
    <Modal open={open} onClose={onClose} title={mode === 'login' ? 'Přihlášení' : 'Zapomenuté heslo'}>
      {mode === 'login' ? (
        <LoginForm onDone={onClose} onForgotten={() => setMode('forgotten')} />
      ) : (
        <ForgottenForm />
      )}
    </Modal>
  );
}

function LoginForm({ onDone, onForgotten }: { onDone: () => void; onForgotten: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const v = useValidation({
    username: !username.trim() && 'Vyplň jméno nebo e-mail.',
    password: !password && 'Vyplň heslo.',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    login.mutate({ username, password }, { onSuccess: onDone });
  };

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input"
          placeholder="jméno nebo e-mail"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input"
          placeholder="heslo"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn" disabled={login.isPending}>
          Přihlásit
        </button>
      </form>
      <FieldError error={v.error('username') || v.error('password')} />
      {login.error instanceof ApiError && login.error.errorType === 'email_not_verified' && (
        <ResendVerification login={username.trim()} />
      )}
      <button type="button" className="mt-3 text-sm underline" onClick={onForgotten}>
        Zapomenuté heslo?
      </button>
    </>
  );
}

function ResendVerification({ login }: { login: string }) {
  const resend = useResendVerification();
  return (
    <div className="callout mt-3">
      {resend.isSuccess ? (
        <p role="status">Odkaz jsme poslali znovu, mrkni do e-mailu.</p>
      ) : (
        <>
          <p>E-mail tohoto účtu ještě není potvrzený.</p>
          <button type="button" className="btn mt-2" disabled={resend.isPending} onClick={() => resend.mutate(login)}>
            Poslat odkaz znovu
          </button>
        </>
      )}
    </div>
  );
}

function ForgottenForm() {
  const [email, setEmail] = useState('');
  const reset = useRequestPasswordReset();
  const v = useValidation({
    email: (!email.trim() && 'Vyplň e-mail.') || (!EMAIL_RE.test(email.trim()) && 'Neplatný e-mail.'),
  });

  if (reset.isSuccess) {
    return (
      <p role="status">
        Pokud k e-mailu {email.trim()} patří účet, poslali jsme na něj odkaz pro nastavení hesla. Platí 24
        hodin. Nepřišel? Zkontroluj spam.
      </p>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    reset.mutate(email.trim());
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-sm">
        Pošleme ti odkaz pro nastavení nového hesla. Funguje i pro účty, kam se přihlašuješ přes Google nebo
        Facebook a heslo zatím nemáš.
      </p>
      <div>
        <input
          className="input"
          type="email"
          placeholder="e-mail"
          aria-label="e-mail"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={v.touch('email')}
          aria-invalid={!!v.error('email')}
        />
        <FieldError error={v.error('email')} />
      </div>
      <button type="submit" className="btn self-start" disabled={reset.isPending}>
        Poslat odkaz
      </button>
    </form>
  );
}
