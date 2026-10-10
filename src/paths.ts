export const playerPath = (p: { pk: number; nickname: string }) =>
  `/players/${p.pk}/${encodeURIComponent(p.nickname)}`;
export const teamPath = (t: { pk: number; name: string }) => `/teams/${t.pk}/${encodeURIComponent(t.name)}`;
export const tournamentResultsPath = (pk: number, totPk?: number) =>
  totPk == null ? `/tournaments/${pk}/results` : `/tournaments/${pk}/results/${totPk}`;
export const recordPath = (t: number) => `/tournaments/${t}/record`;
export const livePath = (t: number) => `/tournaments/${t}/live`;
export const registerPath = (t: number) => `/tournaments/${t}/register`;
export const rosterPath = (t: number, tot: number) => `/tournaments/${t}/teams/${tot}`;
export const matchPath = (t: number, m: number, edit = false) =>
  `/tournaments/${t}/matches/${m}${edit ? '/edit' : ''}`;
export const refereeFeedbackPath = (t: number) => `/tournaments/${t}/referee-feedback`;
