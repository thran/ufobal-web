import type { ReactNode } from 'react';
import { Link } from 'react-router';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { canRecord, isLoggedIn, isStaff } from './permissions';
import { useUser } from './user';

export default function RequireAuth({ level, children }: { level: 'login' | 'authorized' | 'staff'; children: ReactNode }) {
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
  if (level === 'staff' && !isStaff(user)) {
    return <div role="alert" className="callout">Tato stránka je jen pro administrátory.</div>;
  }
  return children;
}
