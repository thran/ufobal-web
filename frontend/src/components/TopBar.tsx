import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useAppConfig } from '../AppContext';
import { isManager } from '../auth/permissions';
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

const linkClass =
  'block px-[15px] py-3 whitespace-nowrap text-white hover:bg-topbar-hover hover:text-white lg:py-0 lg:leading-[45px]';

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { liveTournamentPk } = useAppConfig();
  const { data: user } = useUser();
  const close = () => setOpen(false);

  const nav = [
    ...NAV,
    ...(liveTournamentPk
      ? [{ to: `/tournaments/${liveTournamentPk}/record`, label: 'Aktuální turnaj' }]
      : []),
  ];

  return (
    <nav className="bg-topbar text-[13px]" aria-label="Hlavní navigace">
      <div className="mx-auto flex max-w-[62.5rem] flex-wrap items-center">
        <Link
          to="/"
          onClick={close}
          className="px-[15px] text-[17px] leading-[45px] text-white hover:text-white"
        >
          Ufo-IS
        </Link>
        <button
          type="button"
          className="ml-auto px-[15px] leading-[45px] text-white lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰ Menu
        </button>
        <div
          className={`${open ? 'flex' : 'hidden'} w-full flex-col lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center`}
        >
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={close} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          <div className="flex flex-col lg:ml-auto lg:flex-row lg:items-center">
            <NavLink to="/faq" onClick={close} className={linkClass}>
              Co a jak?
            </NavLink>
            {isManager(user) && (
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
