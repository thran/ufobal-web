const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function hmsToMs(hms: string | null | undefined): number {
  const m = hms?.match(/^(\d{1,2}):(\d{2}):(\d{2})/);
  return m ? ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 : 0;
}

/** Same as old moment.utc(ms).format('HH:mm:ss'): wraps around midnight, floors to seconds. */
export function msToHms(ms: number): string {
  const t = Math.floor((((ms % DAY) + DAY) % DAY) / 1000);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
}

/** Old template showed `time | limitTo:-5`, i.e. "MM:SS". */
export const shortTime = (hms: string) => hms.slice(-5);

export const isValidHms = (s: string) => /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s);

/** Old timer directive display: `[-]MM:SS.d`; overtime is shown via its `999 - millis` trick. */
export function formatClock(remainingMs: number): { text: string; negative: boolean } {
  let m = Math.round(remainingMs / 10) * 10;
  const negative = m < 0;
  if (negative) m = 999 - m;
  const d = Math.floor((m / 100) % 10);
  const s = Math.floor((m / 1000) % 60);
  const min = Math.floor((m / 60_000) % 60);
  return { text: `${negative ? '-' : ''}${pad(min)}:${pad(s)}.${d}`, negative };
}

/** Browser-local "YYYY-MM-DD HH:mm:ss" (format the backend parses for start/end). */
export function nowDateTime(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
