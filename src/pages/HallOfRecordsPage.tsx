import { Link } from 'react-router';
import type { HallOfGloryDto, PlayerSimple, TeamDto, TournamentDto } from '../api/types';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { formatNumber } from '../format';
import { playerPath, teamPath, tournamentResultsPath } from '../paths';
import { useHallOfGlory } from '../queries/data';

type Kind = 'tournament' | 'team' | 'playerTournament';

const RECORDS: { key: keyof HallOfGloryDto; label: string; text: (v: number) => string; kind: Kind }[] = [
  {
    key: 'max_teams_per_tournament',
    label: 'Maximální počet týmů na turnaji:',
    text: (v) => `${formatNumber(v)} týmů na turnaji`,
    kind: 'tournament',
  },
  {
    key: 'max_matches_per_tournament',
    label: 'Maximální počet zápasů na turnaji:',
    text: (v) => `${formatNumber(v)} zápasů na turnaji`,
    kind: 'tournament',
  },
  {
    key: 'max_matches_per_team',
    label: 'Tým s nejvíce zápasy:',
    text: (v) => `${formatNumber(v)} zápasů týmu`,
    kind: 'team',
  },
  {
    key: 'max_goals_per_team',
    label: 'Tým s nejvíce góly:',
    text: (v) => `${formatNumber(v)} gólů týmu`,
    kind: 'team',
  },
  {
    key: 'max_avg_goals_per_team',
    label: 'Tým s nejvíce góly na zápas:',
    text: (v) => `${formatNumber(v, 1)} gólů na zápas týmu`,
    kind: 'team',
  },
  {
    key: 'max_goal_per_tournament_player',
    label: 'Hráč s nejvíce góly na turnaji:',
    text: (v) => `${formatNumber(v)} gólů`,
    kind: 'playerTournament',
  },
  {
    key: 'max_assistance_per_tournament_player',
    label: 'Hráč s nejvíce asistencemi na turnaji:',
    text: (v) => `${formatNumber(v)} asistencí`,
    kind: 'playerTournament',
  },
  {
    key: 'max_goal_per_tournament_player_female',
    label: 'Hráčka s nejvíce góly na turnaji:',
    text: (v) => `${formatNumber(v)} gólů`,
    kind: 'playerTournament',
  },
  {
    key: 'max_assistance_per_tournament_player_female',
    label: 'Hráčka s nejvíce asistencemi na turnaji:',
    text: (v) => `${formatNumber(v)} asistencí`,
    kind: 'playerTournament',
  },
];

const TournamentLink = ({ t }: { t: TournamentDto }) => (
  <Link to={tournamentResultsPath(t.pk)}>{t.full_name}</Link>
);

function Instance({ kind, item }: { kind: Kind; item: unknown }) {
  if (kind === 'tournament') return <TournamentLink t={item as TournamentDto} />;
  if (kind === 'team') {
    const team = item as TeamDto;
    return <Link to={teamPath(team)}>{team.name}</Link>;
  }
  const [player, tournament] = item as [PlayerSimple, TournamentDto];
  return (
    <>
      <Link to={playerPath(player)}>{player.full_name}</Link>, <TournamentLink t={tournament} />
    </>
  );
}

export default function HallOfRecordsPage() {
  const { data, isPending, error, refetch } = useHallOfGlory();

  return (
    <div className="mx-auto max-w-2xl">
      <h3 className="mt-4 text-xl font-bold">Síň rekordů</h3>
      {isPending && <Spinner />}
      {error && <ErrorBox error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          {RECORDS.map(({ key, label, text, kind }) => {
            const record = data[key];
            if (!record || record.instances.length === 0) return null;
            return (
              <div key={key} className="mt-3">
                <div>{label}</div>
                <b>{text(record.value ?? 0)}</b>
                <ul className="ml-12 list-disc">
                  {(record.instances as unknown[]).map((item, i) => (
                    <li key={i}>
                      <Instance kind={kind} item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <hr className="my-4" />
          <i>Některé statistiky jsou počítány až od vzniku UfoISu v roce 2016.</i>
        </>
      )}
    </div>
  );
}
