import { Link, useParams } from 'react-router';
import type { GroupDto, GroupsDto } from '../api/types';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { groupCell, groupRecord, groupScore, PLAYOFF_LABELS } from '../domain/groups';
import { teamPath, tournamentResultsPath } from '../paths';
import { useGroups, useTournament } from '../queries/data';

function RoundRobinTable({ group, data }: { group: GroupDto; data: GroupsDto }) {
  const { level, teams } = group;
  return (
    <div className="overflow-x-auto">
      <table className="table-basic text-center whitespace-nowrap">
        <thead>
          <tr>
            <th />
            {teams.map((t) => (
              <th key={t.pk}>
                <span className="block max-w-[7em] truncate">
                  <Link to={teamPath({ pk: t.team.pk, name: t.team.name })}>{t.name_pure}</Link>
                </span>
              </th>
            ))}
            <th>V / P / R</th>
            <th>Skóre</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row.pk}>
              <th>{row.name_pure}</th>
              {teams.map((col) => (
                <td key={col.pk}>
                  {row.pk === col.pk ? '' : groupCell(data.matches, row.pk, col.pk, level)}
                </td>
              ))}
              <td>{groupRecord(data.stats, row.pk, level)}</td>
              <td>{groupScore(data.stats, row.pk, level)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayoffBracket({ rounds }: { rounds: NonNullable<GroupDto['playoff']> }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[36rem] grid-cols-3 gap-4">
        {[0, 1, 2].map((round) => (
          <div key={round} className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((pair) => (
              <div key={pair}>
                {round === 2 && <div className="text-xs text-gray-500">{PLAYOFF_LABELS[pair]}</div>}
                <div className="rounded border p-2">
                  {[rounds[round]?.[pair * 2], rounds[round]?.[pair * 2 + 1]].map((entry, i) =>
                    entry ? (
                      <div key={i} className={`flex justify-between gap-2 ${entry.win ? 'font-bold' : ''}`}>
                        <span>{entry.name_pure}</span>
                        <span>{entry.score}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const { id } = useParams();
  const pk = Number(id);
  const groups = useGroups(pk);
  const tournament = useTournament(pk);
  return (
    <>
      <BackLink fallback={tournamentResultsPath(pk)} />
      <h1 className="text-3xl">Skupiny - {tournament.data?.full_name ?? ''}</h1>
      {groups.isPending && <Spinner />}
      {groups.error && <ErrorBox error={groups.error} onRetry={() => void groups.refetch()} />}
      {groups.data?.groups.map((group) => (
        <section key={group.pk}>
          <h3 id={group.name} className="mt-4 text-xl font-bold">
            {group.name}
          </h3>
          {group.playoff ? (
            <PlayoffBracket rounds={group.playoff} />
          ) : (
            <RoundRobinTable group={group} data={groups.data} />
          )}
        </section>
      ))}
    </>
  );
}
