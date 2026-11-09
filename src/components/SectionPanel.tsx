import { useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { AddTodo } from './AddTodo';
import { DraggableItem } from './DraggableItem';
import { TodoRow } from './TodoRow';
import { BriefcaseIcon, CartIcon, ChevronIcon, LeafIcon } from './icons';
import { FoldButton, useCollapsible } from './Collapsible';
import { collapse, listItem, softSpring, spring } from '../motion';
import type { Section, Todo, TodoInput, TodoPatch } from '../types';

interface Props {
  section: Section;
  todos: Todo[];
  index: number;
  onAdd: (input: TodoInput) => Promise<boolean>;
  onUpdate: (id: string, patch: TodoPatch) => void;
  onDelete: (id: string) => void;
  /** Saves a new top-to-bottom order for this list's open items. */
  onReorder: (ids: string[]) => void;
}

const META = {
  work: { title: 'Work', Icon: BriefcaseIcon },
  life: { title: 'Life', Icon: LeafIcon },
  grocery: { title: 'Groceries', Icon: CartIcon },
} as const;

// Manual order (set by dragging), oldest first as a tiebreak.
function compareOpen(a: Todo, b: Todo) {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt);
}

export function SectionPanel({ section, todos, index, onAdd, onUpdate, onDelete, onReorder }: Props) {
  const [showDone, setShowDone] = useState(false);
  // While dragging, the live order lives here; it's saved once on drop.
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const { title, Icon } = META[section];
  // Every list folds on small screens. Work starts folded and remembers (it's for the desk);
  // Life and Groceries open fresh every time the app loads.
  const fold = useCollapsible(section === 'work' ? 'work-collapsed' : null);
  const foldable = fold.compact;
  const expanded = !foldable || fold.open;

  const open = todos.filter((t) => !t.done);
  const sorted = [...open].sort(compareOpen);
  const byId = new Map(open.map((t) => [t.id, t]));
  const visible = dragIds ? dragIds.flatMap((id) => byId.get(id) ?? []) : sorted;

  function drop() {
    const ids = visible.map((t) => t.id);
    if (ids.some((id, i) => id !== sorted[i]?.id)) onReorder(ids);
    setDragIds(null);
  }
  const done = todos.filter((t) => t.done).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  function clearCompleted() {
    if (!window.confirm(`Delete ${done.length} completed ${done.length === 1 ? 'reminder' : 'reminders'}?`)) return;
    done.forEach((t) => onDelete(t.id));
  }

  return (
    <motion.section
      id={section}
      className={`card card-${section}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay: 0.12 + index * 0.07 }}
      aria-labelledby={`${section}-title`}
    >
      <header className={`card-head ${foldable ? 'is-foldable' : ''}`} onClick={foldable ? fold.toggle : undefined}>
        <span className="card-badge">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <h2 id={`${section}-title`}>{title}</h2>
        <span className="card-count" aria-label={`${open.length} open`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={open.length}
              initial={{ y: -14, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 14, opacity: 0, filter: 'blur(4px)' }}
              transition={spring}
            >
              {open.length}
            </motion.span>
          </AnimatePresence>
        </span>
        {foldable && (
          <FoldButton open={expanded} onToggle={fold.toggle} label={`${title} list`} controls={`${section}-body`} />
        )}
      </header>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div id={`${section}-body`} className={foldable ? 'card-body is-clipped' : 'card-body'} {...collapse}>
            <AddTodo section={section} onAdd={onAdd} />

            <Reorder.Group as="ul" axis="y" className="list" values={visible.map((t) => t.id)} onReorder={setDragIds}>
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((todo) => (
                  <DraggableItem key={todo.id} todo={todo} onUpdate={onUpdate} onDelete={onDelete} onDrop={drop} />
                ))}
              </AnimatePresence>
            </Reorder.Group>

            <AnimatePresence initial={false}>
              {visible.length === 0 && (
                <motion.div className="empty" {...collapse}>
                  <p>Nothing on your plate.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {done.length > 0 && (
              <div className="completed">
                <div className="completed-bar">
                  <button
                    type="button"
                    className="text-btn is-muted"
                    aria-expanded={showDone}
                    onClick={() => setShowDone((s) => !s)}
                  >
                    <motion.span className="chev" animate={{ rotate: showDone ? 90 : 0 }} transition={spring}>
                      <ChevronIcon size={13} strokeWidth={2.6} />
                    </motion.span>
                    {done.length} Completed
                  </button>
                  <AnimatePresence>
                    {showDone && (
                      <motion.button
                        type="button"
                        className="text-btn"
                        onClick={clearCompleted}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                      >
                        Clear
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence initial={false}>
                  {showDone && (
                    <motion.div {...collapse} className="completed-wrap">
                      <ul className="list">
                        <AnimatePresence initial={false} mode="popLayout">
                          {done.map((todo) => (
                            <motion.li key={todo.id} className="item" {...listItem}>
                              <TodoRow todo={todo} onUpdate={onUpdate} onDelete={onDelete} />
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
