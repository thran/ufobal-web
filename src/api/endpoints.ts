import { api } from './client';
import type { GoalsDto, HallOfGloryDto, PlayerDto, StatsDto, TotDto, TournamentDto } from './types';

export const getPlayers = (signal?: AbortSignal) => api<PlayerDto[]>('players', { signal });
export const getTeamOnTournaments = (signal?: AbortSignal) => api<TotDto[]>('teamontournaments', { signal });
export const getEmptyTournaments = (signal?: AbortSignal) =>
  api<TournamentDto[]>('get_empty_trournaments', { signal });
export const getTournament = (pk: number, signal?: AbortSignal) =>
  api<TournamentDto>(`tournament/${pk}`, { signal });
export const getGoals = (signal?: AbortSignal) => api<GoalsDto>('goals', { signal });
export const getStats = (signal?: AbortSignal) => api<StatsDto>('stats', { signal });
export const getHallOfGlory = (signal?: AbortSignal) => api<HallOfGloryDto>('hall_of_glory', { signal });
