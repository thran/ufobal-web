export const playerPath = (p: { pk: number; nickname: string }) => `/players/${p.pk}/${encodeURIComponent(p.nickname)}`;
