import { useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { timeApi } from '../api';
import { ChevronIcon, PlusIcon, XIcon } from './icons';
import { FoldButton, useCollapsible } from './Collapsible';
import { collapse, listItem, softSpring, spring } from '../motion';
import { addDays, dayKey, formatHours, formatWeek, mondayOf, parseHours, weekdays } from '../timeTracking';
import type { TimeEntry, TimePatch } from '../types';

/** Hours that count as a full day for each column's little bar. */
const FULL_DAY = 8;

const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const weekOf = (day: string) => dayKey(mondayOf(parseDay(day)));
const sum = (entries: TimeEntry[]) => Math.round(entries.reduce((t, e) => t + e.hours, 0) * 100) / 100;

interface Props {
  now: Date;
  onError: (err: unknown) => void;
}

/** Monday–Friday log of what you worked on and for how long. */
export function TimeTracker({ now, onError }: Props) {
  const thisWeek = dayKey(mondayOf(now));
  const today = dayKey(now);
  const [week, setWeek] = useState(thisWeek);
  const [direction, setDirection] = useState(0);
  // Entries per loaded week (keyed by its Monday), so flipping back is instant.
  const [weeks, setWeeks] = useState<Record<string, TimeEntry[]>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const { compact, open, toggle } = useCollapsible('time-collapsed');
  const weeksRef = useRef(weeks);
  weeksRef.current = weeks;

  const load = useCallback((key: string) => {
    setFailed(null);
    timeApi
      .list(key, dayKey(addDays(parseDay(key), 4)))
      .then((list) => setWeeks((w) => ({ ...w, [key]: list })))
      .catch(() => setFailed(key));
  }, []);

  useEffect(() => {
    if (!(week in weeksRef.current)) load(week);
  }, [week, load]);

  const edit = (key: string, fn: (list: TimeEntry[]) => TimeEntry[]) =>
    setWeeks((w) => (key in w ? { ...w, [key]: fn(w[key]) } : w));

  function go(key: string) {
    setDirection(key > week ? 1 : -1);
    setWeek(key);
  }

  // Optimistic: shows up immediately with a temporary id, swapped for the saved one.
  async function add(day: string, label: string, hours: number) {
    const key = weekOf(day);
    const temp: TimeEntry = {
      id: `temp-${crypto.randomUUID()}`,
      day,
      label,
      hours,
      createdAt: new Date().toISOString(),
    };
    edit(key, (list) => [...list, temp]);
    try {
      const saved = await timeApi.create({ day, label, hours });
      edit(key, (list) => list.map((e) => (e.id === temp.id ? saved : e)));
    } catch (err) {
      edit(key, (list) => list.filter((e) => e.id !== temp.id));
      onError(err);
    }
  }

  async function update(entry: TimeEntry, patch: TimePatch) {
    const key = weekOf(entry.day);
    edit(key, (list) => list.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)));
    try {
      const saved = await timeApi.update(entry.id, patch);
      edit(key, (list) => list.map((e) => (e.id === entry.id ? saved : e)));
    } catch (err) {
      edit(key, (list) => list.map((e) => (e.id === entry.id ? entry : e)));
      onError(err);
    }
  }

  async function remove(entry: TimeEntry) {
    const key = weekOf(entry.day);
    edit(key, (list) => list.filter((e) => e.id !== entry.id));
    try {
      await timeApi.remove(entry.id);
    } catch (err) {
      edit(key, (list) => [...list, entry]);
      onError(err);
    }
  }

  const monday = parseDay(week);
  const entries = weeks[week];
  const total = entries ? sum(entries) : null;

  return (
    <motion.section
      className="time glass"
      aria-labelledby="time-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay: 0.1 }}
    >
      <header className={`time-top ${compact ? 'is-foldable' : ''}`} onClick={compact ? toggle : undefined}>
        <div className="time-title">
          <h2 id="time-title" className="time-label">
            Work Time Tracking
          </h2>
          <span className="time-total" aria-label={total === null ? undefined : `${total} hours this week`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total ?? '–'}
                initial={{ y: -12, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: 12, opacity: 0, filter: 'blur(4px)' }}
                transition={spring}
              >
                {total === null ? '–' : formatHours(total)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        {compact && <FoldButton open={open} onToggle={toggle} label="time tracking" controls="time-body" />}

        {open && (
          <nav className="time-nav" aria-label="Week" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence>
              {week !== thisWeek && (
                <motion.button
                  type="button"
                  className="time-today"
                  onClick={() => go(thisWeek)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.94 }}
                  transition={spring}
                >
                  This Week
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              className="time-arrow"
              aria-label="Previous week"
              onClick={() => go(dayKey(addDays(monday, -7)))}
              whileTap={{ scale: 0.85 }}
            >
              <ChevronIcon size={15} strokeWidth={2.4} style={{ transform: 'rotate(180deg)' }} />
            </motion.button>
            <span className="time-range">{formatWeek(monday)}</span>
            <motion.button
              type="button"
              className="time-arrow"
              aria-label="Next week"
              onClick={() => go(dayKey(addDays(monday, 7)))}
              whileTap={{ scale: 0.85 }}
            >
              <ChevronIcon size={15} strokeWidth={2.4} />
            </motion.button>
          </nav>
        )}
      </header>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id="time-body" className="time-body" {...collapse}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={week}
                className="time-week"
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -24 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {failed === week ? (
                  <div className="time-error">
                    <p>Couldn’t load this week.</p>
                    <button type="button" className="text-btn" onClick={() => load(week)}>
                      Try Again
                    </button>
                  </div>
                ) : (
                  weekdays(monday).map((date) => {
                    const key = dayKey(date);
                    return (
                      <DayColumn
                        key={key}
                        date={date}
                        isToday={key === today}
                        entries={entries?.filter((e) => e.day === key)}
                        onAdd={(label, hours) => add(key, label, hours)}
                        onUpdate={update}
                        onRemove={remove}
                      />
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

interface DayProps {
  date: Date;
  isToday: boolean;
  /** Undefined while the week is loading. */
  entries: TimeEntry[] | undefined;
  onAdd: (label: string, hours: number) => void;
  onUpdate: (entry: TimeEntry, patch: TimePatch) => void;
  onRemove: (entry: TimeEntry) => void;
}

function DayColumn({ date, isToday, entries, onAdd, onUpdate, onRemove }: DayProps) {
  const total = entries ? sum(entries) : 0;
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });

  return (
    <div className={`time-day ${isToday ? 'is-today' : ''}`}>
      <div className="time-day-head">
        <span className="time-day-name">
          {weekday}
          <span className="time-day-date">{date.getDate()}</span>
        </span>
        <span className={`time-day-total ${total ? '' : 'is-empty'}`}>{formatHours(total)}</span>
      </div>
      <div className="time-day-bar" aria-hidden="true">
        <motion.span
          className="time-day-fill"
          initial={false}
          animate={{ width: `${Math.min(total / FULL_DAY, 1) * 100}%` }}
          transition={softSpring}
        />
      </div>

      <ul className="time-list" aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long' })} entries`}>
        <AnimatePresence initial={false} mode="popLayout">
          {entries?.map((entry) => (
            <motion.li key={entry.id} className="time-item" {...listItem}>
              <EntryRow entry={entry} onUpdate={onUpdate} onRemove={onRemove} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {entries && <AddEntry onAdd={onAdd} />}
    </div>
  );
}

function EntryRow({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: TimeEntry;
  onUpdate: DayProps['onUpdate'];
  onRemove: DayProps['onRemove'];
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(entry.label);
  const [hours, setHours] = useState('');
  const cancel = useRef(false);
  const saving = entry.id.startsWith('temp-');

  function start() {
    if (saving) return;
    cancel.current = false;
    setLabel(entry.label);
    setHours(String(entry.hours));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (cancel.current) return;
    const patch: TimePatch = {};
    const nextLabel = label.trim();
    const nextHours = parseHours(hours);
    if (nextLabel && nextLabel !== entry.label) patch.label = nextLabel;
    if (nextHours !== null && nextHours !== entry.hours) patch.hours = nextHours;
    if (Object.keys(patch).length) onUpdate(entry, patch);
  }

  // Saves once focus leaves both fields, not when moving between them.
  function blur(e: FocusEvent<HTMLFormElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit();
  }

  function keys(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cancel.current = true;
      (e.target as HTMLElement).blur();
    }
  }

  if (editing) {
    return (
      <form
        className="time-entry is-editing"
        onBlur={blur}
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <input
          className="time-input"
          value={label}
          autoFocus
          maxLength={200}
          aria-label="What you did"
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={keys}
        />
        <input
          className={`time-input time-hours ${parseHours(hours) === null ? 'is-invalid' : ''}`}
          value={hours}
          inputMode="decimal"
          aria-label="Hours"
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={keys}
        />
        <button type="submit" hidden />
      </form>
    );
  }

  return (
    <div className={`time-entry ${saving ? 'is-saving' : ''}`}>
      <button type="button" className="time-entry-text" onClick={start} title={entry.label}>
        <span className="time-entry-label">{entry.label}</span>
        <span className="time-entry-hours">{formatHours(entry.hours)}</span>
      </button>
      <button
        type="button"
        className="time-entry-delete"
        aria-label={`Delete “${entry.label}”`}
        onClick={() => onRemove(entry)}
        disabled={saving}
      >
        <XIcon size={11} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function AddEntry({ onAdd }: { onAdd: DayProps['onAdd'] }) {
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState('');
  const [open, setOpen] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);

  const parsed = parseHours(hours);
  const showHours = open || label !== '' || hours !== '';

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return labelRef.current?.focus();
    if (parsed === null) return hoursRef.current?.focus();
    onAdd(label.trim(), parsed);
    setLabel('');
    setHours('');
    labelRef.current?.focus();
  }

  function blur(e: FocusEvent<HTMLFormElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <form className="time-add" onSubmit={submit} onFocus={() => setOpen(true)} onBlur={blur}>
      <span className="time-add-plus" aria-hidden="true">
        <PlusIcon size={11} strokeWidth={2.8} />
      </span>
      <input
        ref={labelRef}
        className="time-input"
        value={label}
        maxLength={200}
        placeholder="Add"
        aria-label="What you did"
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
      />
      <AnimatePresence initial={false}>
        {showHours && (
          <motion.input
            ref={hoursRef}
            className={`time-input time-hours ${hours && parsed === null ? 'is-invalid' : ''}`}
            value={hours}
            placeholder="hrs"
            inputMode="decimal"
            aria-label="Hours"
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 44 }}
            exit={{ opacity: 0, width: 0 }}
            transition={spring}
          />
        )}
      </AnimatePresence>
      <button type="submit" hidden />
    </form>
  );
}
