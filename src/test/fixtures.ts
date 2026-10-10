import type {
  GoalieStatDto,
  MatchDto,
  PairDto,
  PlayerDto,
  TeamDto,
  TotDto,
  TournamentDto,
} from '../api/types';
import type { RawData } from '../domain/graph';

export const tournamentDto = (o: Partial<TournamentDto> & Pick<TournamentDto, 'pk'>): TournamentDto => ({
  category: 'Brno',
  category_slugname: 'brno',
  name: `Turnaj ${o.pk}`,
  location: 'Brno',
  full_name: `Turnaj ${o.pk} 2023`,
  date: '2023-06-10',
  registration_from: null,
  registration_to: 'None',
  registration_open: false,
  registration_scheduled: false,
  is_tournament_open: false,
  is_after_tournament: true,
  halftime_length: 10,
  field_count: 2,
  year: 2023,
  description: null,
  closed_edit: true,
  ...o,
});

export const teamDto = (o: Partial<TeamDto> & Pick<TeamDto, 'pk' | 'name'>): TeamDto => ({
  name_short: null,
  name_pure: o.name_short ?? o.name,
  description: null,
  ...o,
});

export const playerDto = (o: Partial<PlayerDto> & Pick<PlayerDto, 'pk' | 'nickname'>): PlayerDto => ({
  name: null as unknown as string,
  lastname: null as unknown as string,
  age: null,
  full_name: o.nickname,
  gender: 'man',
  is_paired: false,
  penalties: [],
  ...o,
});

export const totDto = (o: Partial<TotDto> & Pick<TotDto, 'pk' | 'team' | 'tournament'>): TotDto => ({
  captain: null,
  default_goalie: null,
  name: o.team.name,
  name_pure: o.team.name_pure,
  name_short: o.team.name_short,
  rank: null,
  player_pks: [],
  ...o,
});

export const matchDto = (o: Partial<MatchDto> & Pick<MatchDto, 'pk'>): MatchDto => ({
  tournament: 1,
  team_one: 1000,
  team_two: 1001,
  start: null,
  end: null,
  halftime_length: null,
  length: null,
  referee: null,
  referee_team: null,
  fake: false,
  place: null,
  goals: [],
  shots: [],
  penalties: [],
  goalies: [],
  with_shootout: 0,
  score_one: 0,
  score_two: 0,
  ...o,
});

export const sampleMatches = (): MatchDto[] => [
  matchDto({ pk: 500, score_one: 3, score_two: 1, length: '00:20:00', start: '2023-06-10 09:00:00+00:00' }),
  matchDto({
    pk: 501,
    team_one: 1001,
    team_two: 1000,
    score_one: 2,
    score_two: 2,
    with_shootout: 1,
    length: '00:20:00',
    start: '2023-06-10 10:00:00+00:00',
  }),
  matchDto({ pk: 502, score_one: 0, score_two: 0, length: null, start: '2023-06-10 11:00:00+00:00' }),
];

export const samplePairs = (): PairDto[] => [
  { players: [100, 101], points: 2, goals_first: 1, goals_second: 1 },
  { players: [100, 999], points: 5 },
];

export const sampleGoalieStats = (): GoalieStatDto[] => [
  { goalie: 100, tournament: 1, team: 1000, matches: 2, shots: 10, goals: 2 },
  { goalie: 102, tournament: 1, team: 1001, matches: 1, shots: 0, goals: 0 },
  { goalie: 101, tournament: 2, team: 1002, matches: 12, shots: 20, goals: 5 },
];

export const t1 = tournamentDto({
  pk: 1,
  name: 'Brno',
  full_name: 'Brno 2023',
  date: '2023-06-10',
  year: 2023,
});
export const t2 = tournamentDto({
  pk: 2,
  name: 'Nížkov',
  full_name: 'Nížkov 2024',
  date: '2024-07-20',
  year: 2024,
  category: 'Nížkov',
  category_slugname: 'nizkov',
  location: 'Nížkov',
});
export const t3 = tournamentDto({
  pk: 3,
  name: 'Hala',
  full_name: 'Hala 2025',
  date: '2025-01-15',
  year: 2025,
  category: 'Hala',
  category_slugname: 'hala',
});
export const ufo = teamDto({ pk: 10, name: 'Ufo' });
export const kometa = teamDto({ pk: 11, name: 'Kométa', name_short: 'KOM' });

export function sampleRaw(): RawData {
  const pepa = playerDto({
    pk: 100,
    nickname: 'Pépa',
    name: 'Josef',
    lastname: 'Novák',
    age: 30,
    full_name: 'Pépa - Josef Novák',
    penalties: [
      {
        pk: 900,
        card: 'yellow',
        card_verbose: 'žlutá',
        time: '00:05:00',
        match: { pk: 500 },
        tournament: 1,
        player: 100,
        reason: 'Faul',
      },
    ],
  });
  const jana = playerDto({ pk: 101, nickname: 'Jana', gender: 'woman' });
  const karel = playerDto({ pk: 102, nickname: 'Karel' });
  return {
    players: [pepa, jana, karel],
    tots: [
      totDto({ pk: 1000, team: ufo, tournament: t1, rank: 1, player_pks: [100, 101], captain: 100 }),
      totDto({ pk: 1001, team: kometa, tournament: t1, rank: 2 }),
      totDto({
        pk: 1002,
        team: ufo,
        tournament: t2,
        rank: 3,
        player_pks: [100],
        name: 'Béčko (Ufo)',
        name_pure: 'Béčko (Ufo)',
      }),
      totDto({ pk: 1003, team: kometa, tournament: t2, rank: null }),
    ],
    goals: {
      goals: [
        { shooter: 100, match__tournament: 1, count: 3 },
        { shooter: 100, match__tournament: 2, count: 2 },
        { shooter: 101, match__tournament: 1, count: 1 },
        { shooter: 102, match__tournament: 1, count: 4 },
        { shooter: 999, match__tournament: 1, count: 7 },
      ],
      assists: [{ assistance: 101, match__tournament: 1, count: 2 }],
    },
    emptyTournaments: [t3],
  };
}

export const recordedMatch = (): MatchDto =>
  matchDto({
    pk: 500,
    goals: [{ pk: 1, shooter: 100, assistance: 101, match: 500, time: '00:02:00', type: 'normal' }],
    shots: [{ pk: 2, time: '00:03:00', match: 500, shooter: null, team: 1001 }],
    penalties: [
      {
        pk: 3,
        player: 100,
        card: 'yellow',
        card_verbose: 'žlutá',
        reason: 'Držení',
        time: '00:04:00',
        match: { pk: 500 },
        tournament: 1,
      },
    ],
    goalies: [
      { pk: 4, goalie: 101, match: 500, start: '00:00:00', end: null },
      { pk: 5, goalie: 100, match: 500, start: '00:05:00', end: null },
    ],
    halftime_length: '00:10:00',
    length: null,
    start: '2023-06-10 09:00:00+00:00',
    referee: 102,
    referee_team: 1001,
    place: '1',
  });
