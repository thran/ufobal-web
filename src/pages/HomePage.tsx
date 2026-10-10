import { Link } from 'react-router';
import { useAppConfig } from '../AppContext';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { formatDate, formatDateTime, formatNumber } from '../format';
import { useStats, useTournament } from '../queries/data';

export default function HomePage() {
  const { liveTournamentPk } = useAppConfig();
  const stats = useStats();
  const live = useTournament(liveTournamentPk);
  const s = stats.data;
  const t = live.data;
  const registrationTo = t ? formatDate(t.registration_to) : '';

  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-3 text-xl font-bold">Ufobalový Informační Systém</h3>
      {stats.error ? (
        <ErrorBox error={stats.error} onRetry={() => void stats.refetch()} />
      ) : !s ? (
        <Spinner />
      ) : (
        <>
          <p>V systému je aktuálně:</p>
          <ul className="my-2 ml-6 list-disc">
            <li>
              <b>{formatNumber(s.tournament_count)}</b> turnajů od roku <b>{s.min_year}</b> až do roku{' '}
              <b>{s.max_year}</b>
            </li>
            <li>
              <b>{formatNumber(s.player_count)}</b> hráčů z toho <b>{formatNumber(s.player_female_count)}</b>{' '}
              žen a <b>{formatNumber(s.player_male_count)}</b> mužů (zbytek asi velbloudi)
            </li>
            <li>
              <b>{formatNumber(s.team_count)}</b> týmů s jejich{' '}
              <b>{formatNumber(s.team_on_tournament_count)}</b> účastmi na turnajích
            </li>
            <li>
              <b>{formatNumber(s.goals)}</b> gólů a <b>{formatNumber(s.assists)}</b> asistencí
            </li>
            <li>
              <b>{formatNumber(s.active_players)}</b> aktivních hráčů (hrajicích od roku{' '}
              <b>{s.active_players_year}</b>)
            </li>
          </ul>
        </>
      )}
      <p className="my-2 flex flex-col gap-1">
        <a href="http://ufobal.cz" target="_blank" rel="noreferrer">
          Oficiální stránky ufobalu
        </a>
        <a href="/static/záznam_zápasu.pdf" className="font-bold text-red-800">
          Stručný návod na zapisování zápasu
        </a>
      </p>
      <hr className="my-4 border-gray-300" />
      {t && (
        <>
          <h3 className="text-xl font-bold">
            <Link to={`/tournaments/${t.pk}/record`}>{t.full_name}</Link>
          </h3>
          <p>datum: {formatDate(t.date)}</p>
          {t.registration_open && (
            <p>
              <Link to={`/tournaments/${t.pk}/register`}>přihlásit se na turnaj</Link>
              {registrationTo && ` - do ${registrationTo}`}
            </p>
          )}
          {t.registration_scheduled && <p>přihlašování začne {formatDateTime(t.registration_from)}</p>}
          {t.description && (
            // Trusted HTML written by staff in Django admin.
            <div className="my-2" dangerouslySetInnerHTML={{ __html: t.description }} />
          )}
          <hr className="my-4 border-gray-300" />
        </>
      )}
      <h3 className="text-xl font-bold">Jak na UfoIS</h3>
      <a href="https://www.youtube.com/watch?v=jxACZ41WJQI" target="_blank" rel="noreferrer">
        <img src="/static/youtube.png" alt="Jak na UfoIS" />
      </a>
    </div>
  );
}
