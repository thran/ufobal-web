import { Fragment } from 'react';
import { Link, useParams } from 'react-router';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import { formatRank } from '../format';
import { tournamentResultsPath } from '../paths';
import { useGraph } from '../queries/data';

export default function TeamPage() {
  const { id } = useParams();
  const { graph, error, isPending, refetch } = useGraph();
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isPending || !graph) return <Spinner />;

  const team = graph.teamsById.get(Number(id));
  if (!team)
    return (
      <>
        <BackLink fallback="/teams" />
        <div role="alert" className="callout">
          Tým nenalezen.
        </div>
      </>
    );

  const tots = [...team.tots].sort((a, b) => b.tournament.date.localeCompare(a.tournament.date));

  return (
    <>
      <BackLink fallback="/teams" />
      <h1 className="text-3xl">
        {team.name} {team.name_short && `(${team.name_short})`}
      </h1>
      {team.altNames.length > 0 && (
        <h5 className="italic text-gray-500">{team.altNames.map((n) => n.name).join(', ')}</h5>
      )}
      <h3 className="text-xl font-bold">Turnaje</h3>
      <table className="table-basic">
        <thead>
          <tr>
            <th>Turnaj</th>
            <th></th>
            <th>Hráči</th>
            <th className="text-right">Umístění</th>
          </tr>
        </thead>
        <tbody>
          {tots.map((tot) => (
            <tr key={tot.pk}>
              <td>
                <Link to={tournamentResultsPath(tot.tournament.pk, tot.pk)}>{tot.tournament.full_name}</Link>
              </td>
              <td>{tot.name !== team.name && tot.name}</td>
              <td>
                {tot.players.map((p, i) => (
                  <Fragment key={p.pk}>
                    {i > 0 && ', '}
                    <PlayerLink player={p} />
                  </Fragment>
                ))}
              </td>
              <td className="text-right">{formatRank(tot.rank)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
