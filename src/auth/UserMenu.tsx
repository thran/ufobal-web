import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { playerPath } from '../paths';
import LoginDialog from './LoginDialog';
import SignupDialog from './SignupDialog';
import { openSocialLogin, useLogout, useUser } from './user';

const itemClass = 'flex w-full items-center gap-2 px-4 py-2 text-left text-white data-focus:bg-topbar-hover';

export default function UserMenu() {
  const { data: user } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'login' | 'signup' | null>(null);

  const label = user
    ? `${user.first_name} ${user.last_name}${user.player ? ` - ${user.player.nickname}` : ''}`
    : 'Přihlášení';

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton className="px-4 py-3 text-white hover:bg-topbar-hover">{label}</MenuButton>
        <MenuItems anchor="bottom end" className="z-40 min-w-48 bg-topbar shadow-lg focus:outline-none">
          {user ? (
            <>
              <MenuItem>
                <button className={itemClass} onClick={() => navigate(user.player ? playerPath(user.player) : '/pair-account')}>
                  Profil hráče
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => logout.mutate()}>
                  Odhlásit se
                </button>
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem>
                <button className={itemClass} onClick={() => openSocialLogin('google-oauth2')}>
                  <img src="/static/google-icon.png" width={24} height={24} alt="" /> přes <b>Google</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => openSocialLogin('facebook')}>
                  <img src="/static/facebook-icon.png" width={24} height={24} alt="" /> přes <b>Facebook</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => setDialog('login')}>
                  @ přes <b>jméno</b>
                </button>
              </MenuItem>
              <MenuItem>
                <button className={itemClass} onClick={() => setDialog('signup')}>
                  ↑ registrovat
                </button>
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Menu>
      {dialog === 'login' && <LoginDialog open onClose={() => setDialog(null)} />}
      {dialog === 'signup' && <SignupDialog open onClose={() => setDialog(null)} />}
    </>
  );
}
