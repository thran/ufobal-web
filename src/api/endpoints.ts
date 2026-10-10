import { api } from './client';
import type {
  GoalieStatDto,
  GoalsDto,
  GroupsDto,
  HallOfGloryDto,
  MatchDto,
  PairDto,
  PlayerDto,
  StatsDto,
  TotDto,
  TournamentDto,
} from './types';

export const getPlayers = (signal?: AbortSignal) => api<PlayerDto[]>('players', { signal });
export const getTeamOnTournaments = (signal?: AbortSignal) => api<TotDto[]>('teamontournaments', { signal });
export const getEmptyTournaments = (signal?: AbortSignal) =>
  api<TournamentDto[]>('get_empty_trournaments', { signal });
export const getTournament = (pk: number, signal?: AbortSignal) =>
  api<TournamentDto>(`tournament/${pk}`, { signal });
export const getGoals = (signal?: AbortSignal) => api<GoalsDto>('goals', { signal });
export const getStats = (signal?: AbortSignal) => api<StatsDto>('stats', { signal });
export const getHallOfGlory = (signal?: AbortSignal) => api<HallOfGloryDto>('hall_of_glory', { signal });
export const getMatches = (tournament: number, signal?: AbortSignal) =>
  api<MatchDto[]>('matchs', { params: { tournament }, signal });
export const getPairs = (tournament: number, signal?: AbortSignal) =>
  api<PairDto[]>(`pairs/${tournament}`, { signal });
export const getGroups = (tournament: number, signal?: AbortSignal) =>
  api<GroupsDto>(`get_groups/${tournament}`, { signal });
export const getGoalieStats = (tournament?: number, signal?: AbortSignal) =>
  api<GoalieStatDto[]>('goalie_stats', { params: { tournament }, signal });
