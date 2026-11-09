import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from './api';
import { SectionPanel } from './components/SectionPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { TimeTracker } from './components/TimeTracker';
import { WorkdayProgress } from './components/WorkdayProgress';
import { WeatherWidget } from './weather/WeatherWidget';
import { isDueToday, isOverdue } from './dates';
import { softSpring, spring } from './motion';
import type { Section, Todo, TodoInput, TodoPatch } from './types';


const COLUMNS: Section[][] = [['work'], ['life', 'grocery']];
const ORDER = COLUMNS.flat();

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const todosRef = useRef(todos);
  todosRef.current = todos;

  const load = useCallback(() => {
    setStatus('loading');
    api
      .list()
      .then((list) => {
        setTodos(list);
        setStatus('ready');
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  // Keeps the date, greeting and "today"/"overdue" labels current if the app stays open past midnight.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const fail = useCallback((err: unknown) => setToast(err instanceof Error ? err.message : 'Something went wrong'), []);

  const add = useCallback(async (input: TodoInput) => {
    try {
      const created = await api.create(input);
      setTodos((list) => [...list, created]);
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }, []);

  // Optimistic: apply locally right away, reconcile with the server's copy, roll back on failure.
  const update = useCallback(async (id: string, patch: TodoPatch) => {
    const before = todosRef.current.find((t) => t.id === id);
    if (!before) return;
    const completedAt = 'done' in patch ? (patch.done ? new Date().toISOString() : null) : before.completedAt;
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, ...patch, completedAt } : t)));
    try {
      const saved = await api.update(id, patch);
      setTodos((list) => list.map((t) => (t.id === id ? saved : t)));
    } catch (err) {
      setTodos((list) => list.map((t) => (t.id === id ? before : t)));
      fail(err);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const before = todosRef.current.find((t) => t.id === id);
    if (!before) return;
    setTodos((list) => list.filter((t) => t.id !== id));
    try {
      await api.remove(id);
    } catch (err) {
      setTodos((list) => [...list, before]);
      fail(err);
    }
  }, []);

  // Mirrors the server: the listed items swap their existing order values among themselves.
  const reorder = useCallback(async (ids: string[]) => {
    const before = todosRef.current;
    const byId = new Map(before.map((t) => [t.id, t]));
    const slots = ids.map((id) => byId.get(id)!.order).sort((a, b) => a - b);
    const next = new Map(ids.map((id, i) => [id, slots[i]]));
    setTodos((list) => list.map((t) => (next.has(t.id) ? { ...t, order: next.get(t.id)! } : t)));
    try {
      await api.reorder(ids);
    } catch (err) {
      setTodos((list) => list.map((t) => (next.has(t.id) ? { ...t, order: byId.get(t.id)!.order } : t)));
      fail(err);
    }
  }, []);

  // Groceries aren't reminders, so the greeting's count leaves them out.
  const open = todos.filter((t) => !t.done && t.section !== 'grocery');
  const dueNow = open.filter((t) => isDueToday(t) || isOverdue(t)).length;

  const summary =
    status !== 'ready'
      ? ' '
      : open.length === 0
        ? 'You’re all caught up.'
        : dueNow > 0
          ? `${dueNow} ${dueNow === 1 ? 'thing needs' : 'things need'} your attention today.`
          : `${open.length} open ${open.length === 1 ? 'reminder' : 'reminders'}, nothing due today.`;

  return (
    <div className="app">
      <ThemeToggle />
      <header className="hero">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
          <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long' })}</p>
          <h1>{now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h1>
          <p className="summary">
            {greeting(now)}.{summary && ` ${summary}`}
          </p>
        </motion.div>
        <motion.div
          className="hero-side"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: 0.1 }}
        >
          <WeatherWidget />
        </motion.div>
      </header>

      <WorkdayProgress now={now} />
      <TimeTracker now={now} onError={fail} />

      {status === 'error' ? (
        <motion.div className="card state" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <h2>Can’t load your to-dos</h2>
          <p>{loadError || 'Something went wrong.'}</p>
          <button type="button" className="button" onClick={load}>
            Try Again
          </button>
        </motion.div>
      ) : (
        status === 'ready' && (
          // Work on the left; Life with Groceries underneath on the right. One column on small screens.
          <main className="cards">
            {COLUMNS.map((column, c) => (
              <div key={c} className="cards-column">
                {column.map((section) => (
                  <SectionPanel
                    key={section}
                    section={section}
                    index={ORDER.indexOf(section)}
                    todos={todos.filter((t) => t.section === section)}
                    onAdd={add}
                    onUpdate={update}
                    onDelete={remove}
                    onReorder={reorder}
                  />
                ))}
              </div>
            ))}
          </main>
        )
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.94, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 12, scale: 0.96, x: '-50%' }}
            transition={spring}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
