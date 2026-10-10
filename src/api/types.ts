export interface PlayerSimple {
  pk: number;
  name: string;
  lastname: string;
  nickname: string;
  age: number | null;
  full_name: string;
  gender: string;
  is_paired: boolean;
}

export interface User {
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_authorized: boolean;
  player: PlayerSimple | null;
}

export interface PenaltyDto {
  pk: number;
  card: 'red' | 'yellow';
  card_verbose: string;
  time: string;
  match: { pk: number };
  tournament: number;
  player: number;
  reason: string;
}

export interface PlayerDto extends PlayerSimple {
  penalties: PenaltyDto[];
}

export interface TeamDto {
  pk: number;
  name: string;
  name_short: string | null;
  name_pure: string;
  description: string | null;
}

export type CategorySlug = 'brno' | 'nizkov' | 'hala' | 'other' | 'liga' | 'trening';

export interface TournamentDto {
  pk: number;
  category: string | null;
  category_slugname: CategorySlug | null;
  name: string;
  location: string | null;
  full_name: string;
  date: string;
  registration_from: string | null;
  /** 'YYYY-MM-DD' or the literal string 'None'. */
  registration_to: string;
  registration_open: boolean;
  registration_scheduled: boolean;
  is_tournament_open: boolean;
  is_after_tournament: boolean;
  halftime_length: number;
  field_count: number;
  year: number;
  /** Trusted HTML written by staff in Django admin. */
  description: string | null;
  closed_edit: boolean;
}

export interface TotDto {
  pk: number;
  team: TeamDto;
  captain: number | null;
  default_goalie: number | null;
  name: string;
  name_pure: string;
  name_short: string | null;
  tournament: TournamentDto;
  rank: number | null;
  player_pks: number[];
}

export interface GoalsDto {
  goals: { shooter: number; match__tournament: number; count: number }[];
  assists: { assistance: number; match__tournament: number; count: number }[];
}

export interface StatsDto {
  tournament_count: number;
  max_year: number;
  min_year: number;
  player_count: number;
  player_male_count: number;
  player_female_count: number;
  team_count: number;
  team_on_tournament_count: number;
  goals: number;
  assists: number;
  active_players: number;
  active_players_year: number;
}

export interface HallRecord<T> {
  value: number;
  instances: T[];
}

export interface HallOfGloryDto {
  max_teams_per_tournament: HallRecord<TournamentDto>;
  max_matches_per_tournament: HallRecord<TournamentDto>;
  max_matches_per_team: HallRecord<TeamDto>;
  max_goals_per_team: HallRecord<TeamDto>;
  max_avg_goals_per_team: HallRecord<TeamDto>;
  max_goal_per_tournament_player: HallRecord<[PlayerSimple, TournamentDto]>;
  max_assistance_per_tournament_player: HallRecord<[PlayerSimple, TournamentDto]>;
  max_goal_per_tournament_player_female: HallRecord<[PlayerSimple, TournamentDto]>;
  max_assistance_per_tournament_player_female: HallRecord<[PlayerSimple, TournamentDto]>;
}
