export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** "12m 40s", "41s", "1h 04m" */
export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    const rem = s % 60;
    return rem === 0 ? `${m}m` : `${m}m ${String(rem).padStart(2, "0")}s`;
  }
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

/** "9:42pm" — lowercase, no space, Indian restaurant floor habit. */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${suffix}`;
}

/** "Thu, 20 Nov" */
export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** "20 Nov" */
export function dayMonth(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const IST_OFFSET = 5.5 * HOUR;

/** Minutes since local midnight, in the outlet's timezone (IST for the demo). */
export function minutesOfDay(ts: number): number {
  const shifted = new Date(ts + IST_OFFSET);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function startOfDay(ts: number): number {
  const shifted = new Date(ts + IST_OFFSET);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() - IST_OFFSET;
}

export function isoDay(ts: number): string {
  return new Date(ts + IST_OFFSET).toISOString().slice(0, 10);
}

/** SLA countdown label: "0:42" or "+0:32 over" */
export function countdown(dueAt: number, now: number): { text: string; over: boolean } {
  const remaining = dueAt - now;
  const over = remaining < 0;
  const abs = Math.abs(remaining);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const text = `${m}:${String(s).padStart(2, "0")}`;
  return { text: over ? `+${text} over` : text, over };
}

/** "4 min pehle" / "2 ghante pehle" — used where the exact clock time doesn't matter. */
export function relative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < MINUTE) return "abhi";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min pehle`;
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} ${hours === 1 ? "ghanta" : "ghante"} pehle`;
  }
  const days = Math.floor(diff / DAY);
  if (days === 1) return "kal";
  if (days < 7) return `${days} din pehle`;
  return shortDate(ts);
}
