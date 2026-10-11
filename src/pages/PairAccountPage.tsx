import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import LoginDialog from '../auth/LoginDialog';
import SignupDialog from '../auth/SignupDialog';
import { openSocialLogin, useUser } from '../auth/user';
import { FieldError, useValidation } from '../components/forms/validation';
import PlayerLink from '../components/PlayerLink';
import { playerPath } from '../paths';
import { usePairUser } from '../queries/mutations';

const LS_KEY = 'ufo:pairToken';

function readStoredToken(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeToken(token: string | null) {
  try {
    if (token === null) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, token);
  } catch {
    // storage unavailable: the token just won't survive the login
  }
}

export default function PairAccountPage() {
  const { token } = useParams();
  const user = useUser().data;
  const navigate = useNavigate();
  const pair = usePairUser();
  const [code, setCode] = useState(() => token ?? readStoredToken());
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const v = useValidation({ code: !code.trim() && 'Vyplň kód.' });

  const paired = !!user?.player;
  useEffect(() => {
    if (paired) storeToken(null);
    else if (token) storeToken(token);
  }, [token, paired]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    pair.mutate(code.trim(), {
      onSuccess: (player) => {
        storeToken(null);
        void navigate(playerPath(player));
      },
    });
  };

  let body;
  if (!user) {
    body = (
      <>
        <p>Pokud chceš spárovat tvůj účet s nějakým hráčem v systému, musíš se nejdříve přihlásit.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={() => openSocialLogin('google-oauth2')}>
            přes Google
          </button>
          <button type="button" className="btn" onClick={() => openSocialLogin('facebook')}>
            přes Facebook
          </button>
          <button type="button" className="btn" onClick={() => setLoginOpen(true)}>
            přes jméno
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSignupOpen(true)}>
            registrovat
          </button>
        </div>
      </>
    );
  } else if (user.player) {
    body = (
      <p>
        Tvůj účet je spárovaný s hráčem <PlayerLink player={user.player} />
      </p>
    );
  } else {
    body = (
      <>
        <p>
          Před tím než budeš moci dělat akce v systému (měnit osobní informace, přihlašovat tým, zaznamenávat
          zápas, ...), je potřeba, aby sis svůj účet spároval s hráčem v systému. Pokud máš kód, tak ho zadej
          níže. Jinak se můžeš najít mezi <Link to="/players">hráči</Link> a kliknout na „spárovat“. Pokud se
          nemůžeš najít nebo máš jiný problém, prosím obrať se na{' '}
          <a href="mailto:thran@centrum.cz">správce systému</a>.
        </p>
        <form onSubmit={submit} className="flex gap-3">
          <input
            className="input"
            aria-label="kód"
            placeholder="kód"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={!!v.error('code')}
          />
          <button type="submit" className="btn btn-primary" disabled={pair.isPending}>
            Spárovat
          </button>
        </form>
        <FieldError error={v.error('code')} />
        {pair.error && <p className="text-red-600">Spárování se nezdařilo - {pair.error.message}</p>}
      </>
    );
  }

  return (
    <>
      <h2>Párování</h2>
      {body}
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      <SignupDialog open={signupOpen} onClose={() => setSignupOpen(false)} />
    </>
  );
}
