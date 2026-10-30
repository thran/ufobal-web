import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { confirmEmailChange } from '../api/auth';
import { accountQueryKey } from '../auth/user';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { ApiError } from '../api/client';

export default function ConfirmEmailPage() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  // confirming is idempotent on the server, so a query (run once, safe to repeat) fits
  const confirm = useQuery({
    queryKey: ['email-change-confirm', token],
    queryFn: () => confirmEmailChange(token),
    staleTime: Infinity,
    meta: { once: true },
    retry: false,
  });
  const confirmed = confirm.isSuccess;
  useEffect(() => {
    if (confirmed) void qc.invalidateQueries({ queryKey: accountQueryKey });
  }, [confirmed, qc]);

  let body;
  if (confirm.isPending) body = <Spinner />;
  else if (confirm.error instanceof ApiError && confirm.error.status === 400)
    body = (
      <p role="alert" className="callout">
        {confirm.error.message} O změnu e-mailu můžeš požádat znovu v{' '}
        <Link to="/settings">nastavení účtu</Link>.
      </p>
    );
  else if (confirm.error) body = <ErrorBox error={confirm.error} onRetry={() => void confirm.refetch()} />;
  else
    body = (
      <p role="status">
        E-mail změněn na <b>{confirm.data.email}</b>. <Link to="/settings">Zpět do nastavení</Link>
      </p>
    );

  return (
    <div className="mx-auto max-w-md">
      <h2>Potvrzení e-mailu</h2>
      {body}
    </div>
  );
}
