import type { Todo } from './types';

const DAY = 86_400_000;

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today to `day` (negative = past). */
export function daysFromToday(day: string): number {
  return Math.round((parseDay(day).getTime() - startOfToday().getTime()) / DAY);
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDue(day: string): string {
  const diff = daysFromToday(day);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const date = parseDay(day);
  if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

export const isOverdue = (t: Todo) => !t.done && t.due !== null && daysFromToday(t.due) < 0;
export const isDueToday = (t: Todo) => !t.done && t.due !== null && daysFromToday(t.due) === 0;
