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
      <table className="table-basic w-auto border border-[#ddd] text-center whitespace-nowrap">
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

type PlayoffEntry = NonNullable<GroupDto['playoff']>[number][number];

// Bracket geometry in px, following the old table layout.
const ROW = 22;
const COL = 150;
const GAP = 24;
const LABEL = 30;

interface BracketMatch {
  round: number;
  /** Index of the match within the round (entries 2·slot and 2·slot+1). */
  slot: number;
  /** y of the line between the two entries. */
  y: number;
  label?: string;
}

function bracketLayout(): { matches: BracketMatch[]; links: [BracketMatch, BracketMatch, BracketMatch][] } {
  const qf = [0, 1, 2, 3].map((slot) => ({ round: 0, slot, y: slot * 3 * ROW + ROW }));
  const mid = (a: BracketMatch, b: BracketMatch) => (a.y + b.y) / 2;
  const semi = [0, 1].map((slot) => ({ round: 1, slot, y: mid(qf[slot * 2], qf[slot * 2 + 1]) }));
  const final = { round: 2, slot: 0, y: mid(semi[0], semi[1]), label: PLAYOFF_LABELS[0] };
  const third = { round: 2, slot: 1, y: final.y + 2 * ROW + LABEL, label: PLAYOFF_LABELS[1] };
  const loserTop = qf[3].y + 3 * ROW + LABEL;
  const loser = [0, 1].map((slot) => ({ round: 1, slot: slot + 2, y: loserTop + slot * 5 * ROW }));
  const fifth = { round: 2, slot: 2, y: mid(loser[0], loser[1]), label: PLAYOFF_LABELS[2] };
  const seventh = { round: 2, slot: 3, y: fifth.y + 2 * ROW + LABEL, label: PLAYOFF_LABELS[3] };
  return {
    matches: [...qf, ...semi, final, third, ...loser, fifth, seventh],
    links: [
      [qf[0], qf[1], semi[0]],
      [qf[2], qf[3], semi[1]],
      [semi[0], semi[1], final],
      [loser[0], loser[1], fifth],
    ],
  };
}

const BRACKET = bracketLayout();
const colX = (round: number) => round * (COL + GAP);

function BracketEntry({ entry }: { entry: PlayoffEntry | undefined }) {
  return (
    <div
      className={`flex justify-between gap-2 px-2 ${entry?.win ? 'font-bold' : ''}`}
      style={{ height: ROW }}
    >
      <span className="truncate" title={entry?.name_pure}>
        {entry?.name_pure}
      </span>
      <span>{entry?.score}</span>
    </div>
  );
}

function PlayoffBracket({ rounds }: { rounds: NonNullable<GroupDto['playoff']> }) {
  const height = Math.max(...BRACKET.matches.map((m) => m.y)) + ROW + 4;
  const width = colX(2) + COL;
  return (
    <div className="overflow-x-auto">
      <div className="relative text-sm leading-[22px]" style={{ width, height }}>
        <svg className="absolute inset-0" width={width} height={height} aria-hidden>
          <g stroke="black" strokeWidth={1} shapeRendering="crispEdges">
            {BRACKET.matches.map((m) => (
              <line
                key={`${m.round}-${m.slot}`}
                x1={colX(m.round)}
                x2={colX(m.round) + COL}
                y1={m.y}
                y2={m.y}
              />
            ))}
            {BRACKET.links.map(([a, b, to]) => {
              const x = colX(a.round) + COL + GAP / 2;
              return (
                <path
                  key={`${to.round}-${to.slot}`}
                  fill="none"
                  d={`M${colX(a.round) + COL} ${a.y}H${x}V${b.y}H${colX(a.round) + COL}M${x} ${to.y}H${colX(to.round)}`}
                />
              );
            })}
          </g>
        </svg>
        {BRACKET.matches.map((m) => (
          <div
            key={`${m.round}-${m.slot}`}
            className="absolute"
            style={{ left: colX(m.round), top: m.y - ROW, width: COL }}
          >
            {m.label && (
              <div className="absolute bottom-full px-2 text-gray-500" style={{ height: ROW }}>
                {m.label}
              </div>
            )}
            <BracketEntry entry={rounds[m.round]?.[m.slot * 2]} />
            <BracketEntry entry={rounds[m.round]?.[m.slot * 2 + 1]} />
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
