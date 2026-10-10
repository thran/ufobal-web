import { api } from './client';
import type {
  GoalBody,
  MatchPatch,
  PenaltyBody,
  ShotBody,
  GoalieStatDto,
  GoalsDto,
  GroupsDto,
  HallOfGloryDto,
  MatchDto,
  NewMatch,
  NewPlayer,
  NewRegistration,
  NewTeam,
  PairDto,
  PlayerDto,
  PlayerUpdate,
  RefereeFeedbackInput,
  RefereeMatchDto,
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

const pk = async (p: Promise<number | string>) => Number(await p);

export const addTeam = (t: NewTeam) => pk(api<number>('add_team', { method: 'POST', body: t }));
export const addTeamOnTournament = (r: NewRegistration) =>
  pk(api<number>('add_team_on_tournament', { method: 'POST', body: r }));
export const addPlayer = (p: NewPlayer) => pk(api<number>('add_player', { method: 'POST', body: p }));
export const addAttendance = (v: { player: number; team: number }) =>
  api<string>('add_attendance', { method: 'POST', body: v });
// Backend URL pattern contains a literal "(": remove_attendance/<player>-(<team>
export const removeAttendance = (v: { player: number; team: number }) =>
  api<string>(`remove_attendance/${v.player}-(${v.team}`, { method: 'DELETE' });
export const setCaptain = (v: { player: number; team: number }) =>
  api<string>('set_captain', { method: 'POST', body: v });
export const setDefaultGoalie = (v: { player: number; team: number }) =>
  api<string>('set_default_goalie', { method: 'POST', body: v });
export const savePlayer = (p: PlayerUpdate) => api<string>('save_player', { method: 'POST', body: p });
export const addMatch = (m: NewMatch) => pk(api<number>('add_match', { method: 'POST', body: m }));
export const pairUser = (token: string) =>
  api<PlayerDto>(`pair_user/${encodeURIComponent(token)}`, { method: 'POST', body: {} });
export const createPairingRequest = (v: { player: number; text: string }) =>
  api<string>(`create_pairing_request/${v.player}`, { method: 'POST', body: { text: v.text } });
export const getRefereeFeedbacks = (tournament: number, signal?: AbortSignal) =>
  api<RefereeMatchDto[]>(`get_referee_feedbacks/${tournament}`, { signal });
export const saveRefereeFeedback = (f: RefereeFeedbackInput) =>
  pk(api<number>('save_referee_feedback', { method: 'POST', body: f }));
export const addGoal = (b: GoalBody) => pk(api<number>('add_goal', { method: 'POST', body: b }));
export const editGoal = (id: number, b: GoalBody) =>
  api<string>(`edit_goal/${id}`, { method: 'POST', body: b });
export const addShot = (b: ShotBody) => pk(api<number>('add_shot', { method: 'POST', body: b }));
export const addPenalty = (b: PenaltyBody) => pk(api<number>('add_penalty', { method: 'POST', body: b }));
export const editPenalty = (id: number, b: PenaltyBody) =>
  api<string>(`edit_penalty/${id}`, { method: 'POST', body: b });
export const editMatch = (id: number, p: MatchPatch) =>
  api<string>(`edit_match/${id}`, { method: 'POST', body: p });
export const removeMatchEvent = (type: 'goal' | 'shot' | 'penalty', id: number) =>
  api<string>(`remove_${type}/${id}`, { method: 'DELETE' });
// URL uses a literal hyphen between match and team pk.
export const changeGoalie = (
  match: number,
  team: number,
  b: { goalie: number; time: string; client_id?: string },
) => api<string>(`change_goalie/${match}-${team}`, { method: 'POST', body: b });
