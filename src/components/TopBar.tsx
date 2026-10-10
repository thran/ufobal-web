import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useAppConfig } from '../AppContext';
import { isStaff } from '../auth/permissions';
import UserMenu from '../auth/UserMenu';
import { useUser } from '../auth/user';

const NAV = [
  { to: '/tournaments', label: 'Turnaje' },
  { to: '/teams', label: 'Týmy' },
  { to: '/players', label: 'Hráči' },
  { to: '/stats/players', label: 'Statistiky' },
  { to: '/stats/goalies', label: 'Brankáři' },
  { to: '/hall-of-records', label: 'Síň rekordů' },
];

const linkClass = 'block px-4 py-3 text-white hover:bg-topbar-hover hover:text-white';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { liveTournamentPk } = useAppConfig();
  const { data: user } = useUser();
  const close = () => setOpen(false);

  const nav = [...NAV, ...(liveTournamentPk ? [{ to: `/tournaments/${liveTournamentPk}/record`, label: 'Aktuální turnaj' }] : [])];

  return (
    <nav className="bg-topbar text-sm" aria-label="Hlavní navigace">
      <div className="mx-auto flex max-w-[62.5rem] flex-wrap items-center">
        <Link to="/" onClick={close} className="px-4 py-3 text-lg font-bold tracking-wide text-white uppercase hover:text-white">
          Ufo-IS
        </Link>
        <button
          type="button"
          className="ml-auto px-4 py-3 text-white md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰ Menu
        </button>
        <div className={`${open ? 'flex' : 'hidden'} w-full flex-col md:flex md:w-auto md:flex-1 md:flex-row md:items-center`}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={close} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          <div className="flex flex-col md:ml-auto md:flex-row md:items-center">
            <NavLink to="/faq" onClick={close} className={linkClass}>
              Co a jak?
            </NavLink>
            {isStaff(user) && (
              <a href="/managestats/" className={linkClass}>
                Admin
              </a>
            )}
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
