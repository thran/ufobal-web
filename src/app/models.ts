// Entity type
export enum ET {
  Player = 'player',
  Team = 'team',
  Tournament = 'tournament',
  Match = 'match',
  Penalty = 'penalty',
  TeamOnTournament = 'teamOnTournament',
  GoalPair = 'goalPair',
}

export class User {
  first_name!: string;
  last_name!: string;
  is_staff!: boolean;
  is_authorized!: boolean;
  player!: Player | null;
}

export class Entity {
  pk!: number;
}

export class Player extends Entity {
  name!: string;
  lastname!: string;
  nickname!: string;
  age!: number;
  full_name!: string;
  gender!: string;
  is_paired!: boolean;
  penalties!: Penalty[];
  birthdate?: string | Date | null;
  tournaments?: TeamOnTournament[];
  stats?: PlayerStats;
  searchable?: string;
}

export class PlayerStats {
  goals: number = 0;
  assists: number = 0;
  canada: number = 0;
  penalties: number = 0;
  goals_per_tournament: { [tournament: number]: number } = {};
  assists_per_tournament: { [tournament: number]: number } = {};

}

export class Team extends Entity {
  name!: string;
  name_short!: string;
  name_pure!: string;
  description!: string;
  team_on_tournaments?: TeamOnTournament[];
  medals?: number[];
  searchable?: string;
  alternative_names: { [name: string]: number } = {};
}

export class Tournament extends Entity {
  category!: string;
  category_slugname!: string;
  name!: string;
  location!: string;
  full_name!: string;
  date!: string | null;
  registration_to!: string;
  registration_open!: boolean;
  is_tournament_open!: boolean;
  is_after_tournament!: boolean;
  halftime_length!: number;
  field_count!: number;
  fields?: string[];
  year!: number;
  description!: string;
  closed_edit!: boolean;
  team_on_tournaments!: TeamOnTournament[] | null;
  matches?: Match[];
  goalPairs?: GoalPair[];
}

export class Match extends Entity {
  tournament!: Tournament | number;
  team_one!: TeamOnTournament | number;
  team_two!: TeamOnTournament | number;
  start!: Date | string | null;
  end!: Date | string | null;
  halftime_length!: number | null;
  length!: number | null;
  referee!: Player | number | null;
  referee_team!: TeamOnTournament | number | null;
  fake!: boolean;
  score_one!: number;
  score_two!: number;
  with_shootout!: boolean;
  place!: string;
  state?: string;
  searchable?: string;
  goals!: Goal;
  shots!: Shot;
  penalties!: Penalty[];
  goalies!: Goalie;
}

export class Penalty extends Entity {
  card!: string;
  card_verbose!: string;
  time!: string;
  tournament!: Tournament | number;
  player!: number;
  reason!: string;
}

export class TeamOnTournament extends Entity {
  team!: Team;
  tournament!: Tournament;
  captain!: Player | number | null;
  default_goalie!: Player | number | null;
  name!: string;
  name_pure!: string;
  name_short!: string;
  rank!: number;
  matches!: Match[];
  players?: Player[];
  player_pks?: number[];
  goals_scored?: number;
  goals_received?: number;
}

export class GoalPair extends Entity {
  players!: number[];
  points!: number;
  goals_first!: number;
  goals_second!: number;
  player_one?: Player;
  player_two?: Player;

}

export class Goal extends Entity {
  shooter!: number;
  assistance!: number;
  match!: number;
  time!: string | null;
  type!: string;
}

export class Shot extends Entity {
  shooter!: number;
  match!: number;
  time!: string | null;
  team!: number;
}

export class Goalie extends Entity {
  goalie!: number;
  match!: number;
  start!: string;
  end!: string | null;
}


