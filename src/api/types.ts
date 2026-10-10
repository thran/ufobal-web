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
  /** Only present in responses for staff users. */
  birthdate?: string | null;
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

export interface GoalDto {
  pk: number;
  shooter: number | null;
  assistance: number | null;
  match: number;
  time: string | null;
  type: 'normal' | 'penalty' | 'shootout';
}

export interface ShotDto {
  pk: number;
  time: string;
  match: number;
  shooter: number | null;
  team: number | null;
}
export interface GoalieInMatchDto {
  pk: number;
  goalie: number;
  match: number;
  start: string;
  end: string | null;
}
export type GoalType = 'normal' | 'penalty' | 'shootout';
export type CardType = 'yellow' | 'red';
export interface GoalBody {
  match: number;
  shooter: number | null;
  assistance?: number;
  type?: GoalType;
  time: string;
  client_id?: string;
}
export interface ShotBody {
  match: number;
  team: number;
  time: string;
  shooter?: number;
  client_id?: string;
}
export interface PenaltyBody {
  match: number;
  player: number;
  card: CardType;
  reason: string;
  time: string;
  client_id?: string;
}
export interface MatchPatch {
  start?: string;
  end?: string;
  halftime_length?: string;
  length?: string;
  referee?: number;
}

export interface MatchDto {
  pk: number;
  tournament: number;
  team_one: number | null;
  team_two: number | null;
  start: string | null;
  end: string | null;
  halftime_length: string | null;
  length: string | null;
  referee: number | null;
  referee_team: number | null;
  fake: boolean;
  place: string | null;
  goals: GoalDto[];
  shots: ShotDto[];
  penalties: PenaltyDto[];
  goalies: GoalieInMatchDto[];
  /** Number of shootout goals (truthy = decided by shootout). */
  with_shootout: number;
  score_one: number | null;
  score_two: number | null;
}

export interface PairDto {
  players: [number, number];
  points: number;
  goals_first?: number;
  goals_second?: number;
}

export type GroupTotDto = Omit<TotDto, 'player_pks'>;
export type PlayoffEntryDto = GroupTotDto & { score: number; win: boolean };

export interface GroupDto {
  pk: number;
  tournament: TournamentDto;
  teams: GroupTotDto[];
  level: number;
  name: string;
  /** 3 rounds × 8 slots when the group is a detected 8-team playoff. */
  playoff?: PlayoffEntryDto[][];
}

export interface GroupLevelStats {
  score: [number, number];
  wins: number;
  looses: number;
  winsP: number;
  loosesP: number;
  draws: number;
}

export interface GroupsDto {
  groups: GroupDto[];
  /** key `${totA}-${totB}` → level → [scoreA, scoreB, shootoutCount] */
  matches: Record<string, Record<string, [number, number, number]>>;
  /** tot pk → level → stats */
  stats: Record<string, Record<string, GroupLevelStats>>;
}

export interface GoalieStatDto {
  goalie: number;
  tournament: number;
  team: number | null;
  matches: number;
  shots: number;
  goals: number;
}

export interface RefereeFeedbackContent {
  stars: number;
  positives: string[];
  negatives: string[];
  comment: string;
}

export interface RefereeFeedbackDto {
  pk: number;
  match: number;
  author_team: number;
  author: number;
  feedback: RefereeFeedbackContent;
}

export interface RefereeMatchDto {
  pk: number;
  tournament: number;
  start: string | null;
  end: string | null;
  place: string | null;
  team_one: TotDto;
  team_two: TotDto;
  referee_team: TotDto | null;
  referee: PlayerSimple | null;
  referee_feedback?: RefereeFeedbackDto;
}

export interface NewTeam {
  name: string;
  name_short?: string;
  description?: string;
}
export interface NewRegistration {
  tournament: number;
  team: number;
  name?: string;
  name_short?: string;
  contact_mail: string;
  contact_phone: string;
  strength: number;
}
export interface NewPlayer {
  nickname: string;
  name?: string;
  lastname?: string;
  gender?: 'man' | 'woman' | null;
  birthdate?: string | null;
}
export interface PlayerUpdate {
  pk: number;
  nickname?: string;
  name?: string;
  lastname?: string;
  gender?: 'man' | 'woman' | null;
  birthdate?: string | null;
}
export interface NewMatch {
  tournament: number;
  team_one: number;
  team_two: number;
  referee_team: number;
  place: string;
}
export interface RefereeFeedbackInput {
  pk?: number;
  match: number;
  feedback: RefereeFeedbackContent;
}
