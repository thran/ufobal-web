import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { checkResetLink, type NewPassword } from '../api/auth';
import LoginDialog from '../auth/LoginDialog';
import NewPasswordFields, { EMPTY_PASSWORD, newPasswordErrors } from '../auth/NewPasswordFields';
import { useConfirmPasswordReset } from '../auth/user';
import ErrorBox from '../components/ErrorBox';
import { useValidation } from '../components/forms/validation';
import Spinner from '../components/Spinner';

export default function ResetPasswordPage() {
  const { uid = '', token = '' } = useParams();
  const check = useQuery({
    queryKey: ['password-reset-check', uid, token],
    queryFn: () => checkResetLink({ uid, token }),
    staleTime: Infinity,
  });
  const [forgottenOpen, setForgottenOpen] = useState(false);

  let body;
  if (check.isPending) body = <Spinner />;
  else if (check.error) body = <ErrorBox error={check.error} onRetry={() => void check.refetch()} />;
  else if (!check.data.valid)
    body = (
      <>
        <p role="alert" className="callout">
          Odkaz je neplatný, už byl použitý nebo vypršel (platí 24 hodin).
        </p>
        <button type="button" className="btn" onClick={() => setForgottenOpen(true)}>
          Poslat nový odkaz
        </button>
        {forgottenOpen && <LoginDialog open forgotten onClose={() => setForgottenOpen(false)} />}
      </>
    );
  else
    body = (
      <ResetForm
        uid={uid}
        token={token}
        username={check.data.username}
        hadPassword={check.data.has_password}
      />
    );

  return (
    <div className="mx-auto max-w-md">
      <h2>Nastavení hesla</h2>
      {body}
    </div>
  );
}

function ResetForm({
  uid,
  token,
  username,
  hadPassword,
}: {
  uid: string;
  token: string;
  username: string;
  hadPassword: boolean;
}) {
  const [password, setPassword] = useState<NewPassword>(EMPTY_PASSWORD);
  const confirm = useConfirmPasswordReset();
  const navigate = useNavigate();
  const v = useValidation(newPasswordErrors(password));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    confirm.mutate(
      { uid, token, ...password },
      {
        onSuccess: () => {
          toast.success('Heslo nastaveno.');
          void navigate('/settings');
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p>
        {hadPassword ? 'Nové heslo pro účet' : 'Heslo pro účet'} <b>{username}</b>. Pak se můžeš přihlásit
        tímto jménem nebo svým e-mailem.
      </p>
      <NewPasswordFields value={password} onChange={setPassword} error={v.error} touch={v.touch} />
      <button type="submit" className="btn self-start" disabled={confirm.isPending}>
        Nastavit heslo
      </button>
    </form>
  );
}
