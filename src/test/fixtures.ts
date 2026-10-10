import type { PlayerDto, TeamDto, TotDto, TournamentDto } from '../api/types';
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

export const totDto = (
  o: Partial<TotDto> & Pick<TotDto, 'pk' | 'team' | 'tournament'>,
): TotDto => ({
  captain: null,
  default_goalie: null,
  name: o.team.name,
  name_pure: o.team.name_pure,
  name_short: o.team.name_short,
  rank: null,
  player_pks: [],
  ...o,
});

export const t1 = tournamentDto({ pk: 1, name: 'Brno', full_name: 'Brno 2023', date: '2023-06-10', year: 2023 });
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
export const t3 = tournamentDto({ pk: 3, name: 'Hala', full_name: 'Hala 2025', date: '2025-01-15', year: 2025, category: 'Hala', category_slugname: 'hala' });
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
      { pk: 900, card: 'yellow', card_verbose: 'žlutá', time: '00:05:00', match: { pk: 500 }, tournament: 1, player: 100, reason: 'Faul' },
    ],
  });
  const jana = playerDto({ pk: 101, nickname: 'Jana', gender: 'woman' });
  const karel = playerDto({ pk: 102, nickname: 'Karel' });
  return {
    players: [pepa, jana, karel],
    tots: [
      totDto({ pk: 1000, team: ufo, tournament: t1, rank: 1, player_pks: [100, 101], captain: 100 }),
      totDto({ pk: 1001, team: kometa, tournament: t1, rank: 2 }),
      totDto({ pk: 1002, team: ufo, tournament: t2, rank: 3, player_pks: [100], name: 'Béčko (Ufo)', name_pure: 'Béčko (Ufo)' }),
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
