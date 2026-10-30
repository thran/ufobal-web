import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { verifyEmail } from '../api/auth';
import { ApiError } from '../api/client';
import LoginDialog from '../auth/LoginDialog';
import { useSetLoggedInUser } from '../auth/user';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';

export default function VerifyEmailPage() {
  const { token = '' } = useParams();
  // a query, not a mutation: it runs once per token even when React mounts the page twice (the link works once)
  const verify = useQuery({
    queryKey: ['email-verify', token],
    queryFn: () => verifyEmail(token),
    staleTime: Infinity,
    meta: { once: true },
    retry: false,
  });
  const setUser = useSetLoggedInUser();
  const user = verify.data;
  useEffect(() => {
    if (user) setUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the confirmation logged the user in
  }, [user]);
  const [loginOpen, setLoginOpen] = useState(false);

  let body;
  if (verify.isPending) body = <Spinner />;
  else if (verify.error instanceof ApiError && verify.error.status === 400)
    body = (
      <>
        <p role="alert" className="callout">
          {verify.error.message}
        </p>
        <button type="button" className="btn" onClick={() => setLoginOpen(true)}>
          Přihlásit se
        </button>
        {loginOpen && <LoginDialog open onClose={() => setLoginOpen(false)} />}
      </>
    );
  else if (verify.error) body = <ErrorBox error={verify.error} onRetry={() => void verify.refetch()} />;
  else
    body = (
      <p role="status">
        E-mail potvrzený, účet je aktivní a jsi přihlášen(a). Pokračuj třeba{' '}
        <Link to="/pair-account">spárováním účtu s hráčem</Link>.
      </p>
    );

  return (
    <div className="mx-auto max-w-md">
      <h2>Potvrzení registrace</h2>
      {body}
    </div>
  );
}
