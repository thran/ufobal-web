export const playerPath = (p: { pk: number; nickname: string }) =>
  `/players/${p.pk}/${encodeURIComponent(p.nickname)}`;
export const teamPath = (t: { pk: number; name: string }) => `/teams/${t.pk}/${encodeURIComponent(t.name)}`;
export const tournamentResultsPath = (pk: number, totPk?: number) =>
  totPk == null ? `/tournaments/${pk}/results` : `/tournaments/${pk}/results/${totPk}`;
