import type { GroupsDto } from '../api/types';

export const PLAYOFF_LABELS = ['Finále', 'O 3. místo', 'O 5. místo', 'O 7. místo'];

/** Result of a/b match on the given group level, e.g. "3 : 1" (with " P" for a shootout). */
export function groupCell(matches: GroupsDto['matches'], a: number, b: number, level: number): string {
  const m = matches[`${a}-${b}`]?.[level];
  if (!m) return '';
  return `${m[0]} : ${m[1]}${m[2] ? ' P' : ''}`;
}

export function groupRecord(stats: GroupsDto['stats'], tot: number, level: number): string {
  const s = stats[tot]?.[level];
  if (!s) return '';
  return `${s.wins}${s.winsP ? `(${s.winsP}P)` : ''} / ${s.looses}${s.loosesP ? `(${s.loosesP}P)` : ''} / ${s.draws}`;
}

export function groupScore(stats: GroupsDto['stats'], tot: number, level: number): string {
  const s = stats[tot]?.[level];
  return s ? `${s.score[0]} : ${s.score[1]}` : '';
}
