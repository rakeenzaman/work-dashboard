export type Section = 'work' | 'life' | 'grocery';

export interface Todo {
  id: string;
  text: string;
  notes: string;
  section: Section;
  done: boolean;
  priority: boolean;
  /** Local calendar day, `YYYY-MM-DD`. */
  due: string | null;
  createdAt: string;
  completedAt: string | null;
  /** Manual position (lower = higher up); only relative order matters. */
  order: number;
}

export type TodoInput = Pick<Todo, 'text' | 'section'> & Partial<Pick<Todo, 'priority' | 'due' | 'notes'>>;
export type TodoPatch = Partial<Pick<Todo, 'text' | 'notes' | 'section' | 'done' | 'priority' | 'due'>>;

export interface TimeEntry {
  id: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  label: string;
  hours: number;
  createdAt: string;
}

export type TimeInput = Pick<TimeEntry, 'day' | 'label' | 'hours'>;
export type TimePatch = Partial<TimeInput>;
