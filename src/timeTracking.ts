/** `YYYY-MM-DD` for a local date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `d` (Saturday and Sunday belong to the week just finished). */
export function mondayOf(d: Date): Date {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/** Monday to Friday of the week starting on `monday`. */
export const weekdays = (monday: Date) => Array.from({ length: 5 }, (_, i) => addDays(monday, i));

/**
 * Reads what you'd naturally type for a duration: `1.5`, `.5`, `1:30`, `90m`, `1h`, `1h 30m`.
 * Returns hours rounded to 2 decimals, or null if it isn't a duration between 0 and 24 hours.
 */
export function parseHours(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  let hours: number;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+):([0-5]\d)$/))) hours = Number(m[1]) + Number(m[2]) / 60;
  else if ((m = s.match(/^(\d*\.?\d+)m(in)?s?$/))) hours = Number(m[1]) / 60;
  else if ((m = s.match(/^(?:(\d*\.?\d+)h(?:rs?|ours?)?)?(?:(\d+)m(?:in)?s?)?$/)) && (m[1] || m[2]))
    hours = Number(m[1] ?? 0) + Number(m[2] ?? 0) / 60;
  else if (/^\d*\.?\d+$/.test(s)) hours = Number(s);
  else return null;
  hours = Math.round(hours * 100) / 100;
  return hours > 0 && hours <= 24 ? hours : null;
}

/** 1.5 → "1.5h", 0.25 → "0.25h", 2 → "2h". */
export const formatHours = (hours: number) => `${Math.round(hours * 100) / 100}h`;

/** "Nov 9 – 13", or "Oct 27 – Nov 1" across months. */
export function formatWeek(monday: Date): string {
  const friday = addDays(monday, 4);
  const start = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end =
    friday.getMonth() === monday.getMonth()
      ? String(friday.getDate())
      : friday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const year = monday.getFullYear() !== new Date().getFullYear() ? `, ${friday.getFullYear()}` : '';
  return `${start} – ${end}${year}`;
}
