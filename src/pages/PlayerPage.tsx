import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { isOwnPlayer, isStaff } from '../auth/permissions';
import { useUser } from '../auth/user';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import { CrossIcon, LinkIcon, PencilIcon } from '../components/icons';
import { FieldError, useValidation } from '../components/forms/validation';
import Spinner from '../components/Spinner';
import { scoreWithoutTeam } from '../domain/graph';
import { formatRank } from '../format';
import { teamPath, tournamentResultsPath } from '../paths';
import { useGraph } from '../queries/data';
import { useAddAttendance, useRemoveAttendance } from '../queries/mutations';
import PlayerEditForm from './PlayerEditForm';
import PlayerPairingDialog from './PlayerPairingDialog';

const SIGNS: Record<string, string> = { man: '♂', woman: '♀' };

const actionLink = 'flex cursor-pointer items-center gap-1 text-primary hover:text-primary-dark';

export default function PlayerPage() {
  const { id } = useParams();
  // Remount per player so edit/pairing/history state does not leak between players.
  return <PlayerDetail key={id} id={id} />;
}

function PlayerDetail({ id }: { id: string | undefined }) {
  const { graph, error, isPending, refetch } = useGraph();
  const { data: user } = useUser();
  const removeAttendance = useRemoveAttendance();
  const addAttendance = useAddAttendance();
  const [editing, setEditing] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [histTournament, setHistTournament] = useState('');
  const [histTeam, setHistTeam] = useState('');
  const hist = useValidation({
    tournament: !histTournament && 'Vyber turnaj.',
    team: !histTeam && 'Vyber tým.',
  });
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;

  const player = graph.playersById.get(Number(id));
  if (!player)
    return (
      <>
        <BackLink fallback="/players" />
        <div role="alert" className="callout">
          Hráč nenalezen.
        </div>
      </>
    );

  const canEdit = isStaff(user) || isOwnPlayer(user, player.pk);
  const histTournamentVM = graph.tournamentsById.get(Number(histTournament));
  const histTots = [...(histTournamentVM?.tots ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const allTournaments = [...graph.tournaments].sort((a, b) => b.date.localeCompare(a.date));
  const removeTot = (totPk: number) => {
    if (window.confirm('Opravdu chcete smazat tuto účast na turnaji?'))
      removeAttendance.mutate({ player: player.pk, team: totPk });
  };
  const addHistorical = () =>
    hist.attempt() &&
    addAttendance.mutate(
      { player: player.pk, team: Number(histTeam) },
      {
        onSuccess: () => {
          setHistTournament('');
          setHistTeam('');
          hist.reset();
        },
      },
    );
  const tots = [...player.tots].sort((a, b) => b.tournament.date.localeCompare(a.tournament.date));
  const noTeam = scoreWithoutTeam(player, graph);
  const fullName = [player.name, player.lastname].filter(Boolean).join(' ');
  const sign = SIGNS[player.gender] ?? '';
  const ageText = player.age != null ? `(${player.age})` : '';
  const subtitle = [fullName, ageText].filter(Boolean).join(' ');

  return (
    <>
      <BackLink fallback="/players" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{player.nickname}</h1>
          {subtitle && (
            <h2>
              {sign && <span aria-hidden="true">{sign} </span>}
              {subtitle}
            </h2>
          )}
        </div>
        <div className="flex gap-4">
          {canEdit && !editing && (
            <button type="button" className={actionLink} onClick={() => setEditing(true)}>
              <PencilIcon /> upravit profil
            </button>
          )}
          {editing && (
            <button type="button" className={actionLink} onClick={() => setEditing(false)}>
              <CrossIcon /> zrušit změny
            </button>
          )}
          {user && !user.player && !player.is_paired && (
            <button type="button" className={actionLink} onClick={() => setPairing(true)}>
              <LinkIcon /> spárovat
            </button>
          )}
        </div>
      </div>
      {editing && (
        <PlayerEditForm player={player} isStaffUser={isStaff(user)} onDone={() => setEditing(false)} />
      )}
      <hr className="my-3 border-gray-300" />
      <h3 className="text-xl font-bold">Turnaje</h3>
      <table className="table-basic">
        <thead>
          <tr>
            <th>Turnaj</th>
            <th>Tým</th>
            <th className="text-right">Góly</th>
            <th className="text-right">Asistence</th>
            <th className="text-right">Kanada</th>
            <th className="text-right">Umístění</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {tots.map((tot) => {
            const t = tot.tournament;
            const goals = player.goals[t.pk];
            const assists = player.assists[t.pk];
            return (
              <tr key={tot.pk}>
                <td>
                  <Link to={tournamentResultsPath(t.pk, tot.pk)}>{t.full_name}</Link>
                </td>
                <td>
                  <Link to={teamPath({ pk: tot.team.pk, name: tot.name })}>{tot.name}</Link>
                </td>
                <td className="text-right">{goals}</td>
                <td className="text-right">{assists}</td>
                <td className="text-right">
                  {goals == null && assists == null ? '' : (goals ?? 0) + (assists ?? 0)}
                </td>
                <td className="text-right">{formatRank(tot.rank)}</td>
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="cursor-pointer text-red-700"
                      aria-label={`Smazat účast ${t.full_name}`}
                      onClick={() => removeTot(tot.pk)}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {canEdit && (
        <>
          <h4 className="mt-4 font-bold">Přidávání historických turnajů</h4>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="hist-tournament">Turnaj</label>
              <select
                id="hist-tournament"
                className="input"
                value={histTournament}
                onChange={(e) => {
                  setHistTournament(e.target.value);
                  setHistTeam('');
                }}
                aria-invalid={!!hist.error('tournament')}
              >
                <option value="">----</option>
                {allTournaments.map((t) => (
                  <option key={t.pk} value={t.pk}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hist-team">Tým</label>
              <select
                id="hist-team"
                className="input"
                value={histTeam}
                onChange={(e) => setHistTeam(e.target.value)}
                aria-invalid={!!hist.error('team')}
              >
                <option value="">----</option>
                {histTots.map((t) => (
                  <option key={t.pk} value={t.pk}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={addAttendance.isPending}
              onClick={addHistorical}
            >
              přidat
            </button>
          </div>
          <FieldError error={hist.error('tournament') || hist.error('team')} />
        </>
      )}
      <h3 className="mt-4 text-xl font-bold">Karty</h3>
      <table className="table-basic">
        <thead>
          <tr>
            <th></th>
            <th>Zdůvodnění</th>
            <th>Turnaj</th>
            <th>Zápas</th>
          </tr>
        </thead>
        <tbody>
          {player.penalties.map((pen) => (
            <tr key={pen.pk}>
              <td>{pen.card_verbose}</td>
              <td>{pen.reason}</td>
              <td>
                {pen.tournament ? (
                  <Link to={tournamentResultsPath(pen.tournament.pk)}>{pen.tournament.full_name}</Link>
                ) : (
                  pen.tournamentPk
                )}
              </td>
              <td>
                <Link to={`/tournaments/${pen.tournamentPk}/matches/${pen.match.pk}`}>detail</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {noTeam.length > 0 && (
        <>
          <h4 className="mt-4 font-bold">What? Turnaje se skórem, ale bez týmu</h4>
          {noTeam.map((s) => (
            <div key={s.tournament.pk}>
              {s.tournament.full_name} - {s.goals} gólů a {s.assists} asistencí
            </div>
          ))}
        </>
      )}
      {pairing && <PlayerPairingDialog open onClose={() => setPairing(false)} playerPk={player.pk} />}
    </>
  );
}
