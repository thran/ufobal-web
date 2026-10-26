import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { canRecord, isLoggedIn, isManager } from './permissions';
import { useUser } from './user';

export default function RequireAuth({ level, children }: { level: 'login' | 'authorized' | 'manager'; children: ReactNode }) {
  const { data: user, isPending, error, refetch } = useUser();
  if (isPending) return <Spinner />;
  if (error && !user) return <ErrorBox error={error} onRetry={() => void refetch()} />;

  if (!isLoggedIn(user)) {
    return <div role="alert" className="callout">Pro tuto stránku se musíš přihlásit.</div>;
  }
  if (level === 'authorized' && !canRecord(user)) {
    return (
      <div role="alert" className="callout">
        Nemáš oprávnění. Nejdřív si spáruj účet s hráčem: <Link to="/pair-account">Spárovat účet</Link>
      </div>
    );
  }
  if (level === 'manager' && !isManager(user)) {
    return <div role="alert" className="callout">Tato stránka je jen pro správce.</div>;
  }
  return children;
}
