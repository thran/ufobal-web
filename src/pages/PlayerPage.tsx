import { Link, useParams } from 'react-router';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { scoreWithoutTeam } from '../domain/graph';
import { formatRank } from '../format';
import { teamPath, tournamentResultsPath } from '../paths';
import { useGraph } from '../queries/data';

const SIGNS: Record<string, string> = { man: '♂', woman: '♀' };

export default function PlayerPage() {
  const { id } = useParams();
  const { graph, error, isPending, refetch } = useGraph();
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

  const tots = [...player.tots].sort((a, b) => b.tournament.date.localeCompare(a.tournament.date));
  const noTeam = scoreWithoutTeam(player, graph);
  const fullName = [player.name, player.lastname].filter(Boolean).join(' ');
  const sign = SIGNS[player.gender] ?? '';
  const ageText = player.age != null ? `(${player.age})` : '';
  const subtitle = [fullName, ageText].filter(Boolean).join(' ');

  return (
    <>
      <BackLink fallback="/players" />
      <h1 className="text-3xl">{player.nickname}</h1>
      {subtitle && (
        <h2>
          {sign && <span aria-hidden="true">{sign} </span>}
          {subtitle}
        </h2>
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
              </tr>
            );
          })}
        </tbody>
      </table>
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
              {s.tournament.full_name} - {s.goals} golů a {s.assists} assistencí
            </div>
          ))}
        </>
      )}
    </>
  );
}
