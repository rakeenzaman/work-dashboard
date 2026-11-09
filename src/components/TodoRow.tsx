import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Checkbox } from './Checkbox';
import { PickerField } from './PickerField';
import { Switch } from './Switch';
import { ArrowIcon, CalendarIcon, InfoIcon, NoteIcon, TrashIcon } from './icons';
import { Siren, useSirenPhase } from './Siren';
import { collapse } from '../motion';
import { formatDue, isDueToday, isOverdue } from '../dates';
import type { Section, Todo, TodoPatch } from '../types';

interface Props {
  todo: Todo;
  onUpdate: (id: string, patch: TodoPatch) => void;
  onDelete: (id: string) => void;
  /** Starts a drag; omitted for items that can't be reordered. */
  onGrab?: (e: PointerEvent) => void;
  /** True right after a drag, so the release doesn't also count as a click. */
  wasDragged?: () => boolean;
}

const LIST_NAMES: Record<Section, string> = { work: 'Work', life: 'Life', grocery: 'Groceries' };

// Like Reminders, a checked item lingers briefly so you see it complete before it slides away.
const COMPLETE_DELAY = 650;
const UNCOMPLETE_DELAY = 250;

// On touch, a row picks up after a press-and-hold; moving the finger sooner is a scroll instead.
const HOLD_DELAY = 350;
const HOLD_SLOP = 8;

export function TodoRow({ todo, onUpdate, onDelete, onGrab, wasDragged }: Props) {
  const [pending, setPending] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(todo.notes);
  const [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const cancelEdit = useRef(false);
  // Ends a pending or active touch hold (clears its timer and listeners).
  const releaseHold = useRef<(() => void) | null>(null);
  // True once a hold fired, so lifting the finger without dragging doesn't also open editing.
  const wasHeld = useRef(false);

  useEffect(() => setNotes(todo.notes), [todo.notes]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      releaseHold.current?.();
    },
    [],
  );

  const checked = pending ?? todo.done;
  const others = (Object.keys(LIST_NAMES) as Section[]).filter((s) => s !== todo.section);

  function toggle() {
    if (pending !== null) {
      window.clearTimeout(timer.current);
      setPending(null);
      return;
    }
    const next = !todo.done;
    setPending(next);
    timer.current = window.setTimeout(
      () => {
        setPending(null);
        onUpdate(todo.id, { done: next });
      },
      next ? COMPLETE_DELAY : UNCOMPLETE_DELAY,
    );
  }

  // Drag from anywhere on the row except its controls: straight away with a mouse, after a hold on touch.
  function grab(e: PointerEvent) {
    if (!onGrab || editing || e.button !== 0) return;
    if ((e.target as Element).closest('input, textarea, .check, .info-btn')) return;
    if (e.pointerType === 'mouse') onGrab(e);
    else startHold(e);
  }

  function startHold(e: PointerEvent) {
    releaseHold.current?.();
    wasHeld.current = false;
    const start = { x: e.clientX, y: e.clientY };
    const id = e.pointerId;

    // While held, the page must not scroll under the finger: cancel touchmove (non-passive, so iOS obeys).
    const blockScroll = (ev: TouchEvent) => ev.cancelable && ev.preventDefault();
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === id && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > HOLD_SLOP) end();
    };
    const end = () => {
      window.clearTimeout(hold);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.removeEventListener('touchmove', blockScroll);
      setHeld(false);
      releaseHold.current = null;
    };
    const hold = window.setTimeout(() => {
      window.removeEventListener('pointermove', move);
      document.addEventListener('touchmove', blockScroll, { passive: false });
      wasHeld.current = true;
      setHeld(true);
      onGrab?.(e);
    }, HOLD_DELAY);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    releaseHold.current = end;
  }

  function startEdit() {
    if (wasHeld.current) {
      wasHeld.current = false;
      return;
    }
    if (todo.done || wasDragged?.()) return;
    cancelEdit.current = false;
    setDraft(todo.text);
    setEditing(true);
  }

  function commitEdit() {
    const value = draft.trim();
    if (!cancelEdit.current && value && value !== todo.text) onUpdate(todo.id, { text: value });
    setEditing(false);
  }

  function commitNotes() {
    if (notes !== todo.notes) onUpdate(todo.id, { notes });
  }

  const urgent = todo.priority && !checked;
  const sirenPhase = useSirenPhase(urgent);
  const overdue = isOverdue(todo);
  const today = isDueToday(todo);
  const hasMeta = todo.due || todo.notes;

  return (
    <div className={`row ${checked ? 'is-done' : ''} ${expanded ? 'is-expanded' : ''} ${held ? 'is-held' : ''}`}>
      <div className={`row-main ${urgent ? 'is-urgent' : ''}`} style={sirenPhase} onPointerDown={grab}>
        <Checkbox checked={checked} label={`Complete “${todo.text}”`} onToggle={toggle} />

        <div className="row-body">
          {editing ? (
            <input
              className="row-edit"
              value={draft}
              autoFocus
              maxLength={500}
              aria-label="Edit reminder"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  cancelEdit.current = true;
                  e.currentTarget.blur();
                }
              }}
            />
          ) : (
            <button type="button" className="row-text" onClick={startEdit} disabled={todo.done}>
              {todo.text}
            </button>
          )}

          {hasMeta && (
            <div className="row-meta">
              {todo.due && (
                <span className={`meta ${overdue ? 'is-overdue' : ''} ${today ? 'is-today' : ''}`}>
                  <CalendarIcon size={12} />
                  {formatDue(todo.due)}
                </span>
              )}
              {todo.notes && !expanded && (
                <span className="meta meta-notes">
                  <NoteIcon size={12} />
                  {todo.notes.split('\n')[0]}
                </span>
              )}
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {urgent && (
            <motion.span
              className="row-siren"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            >
              <Siren />
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="info-btn"
          aria-label="Show details"
          aria-expanded={expanded}
          onClick={() => setExpanded((x) => !x)}
          whileTap={{ scale: 0.85 }}
        >
          <InfoIcon size={19} />
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div className="details-wrap" {...collapse}>
            <div className="details">
              <textarea
                className="notes"
                placeholder="Add Note"
                value={notes}
                maxLength={2000}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={commitNotes}
              />

              <div className="group">
                <div className="group-row">
                  <span className="glyph glyph-red">
                    <CalendarIcon size={15} />
                  </span>
                  <span className="group-label">Date</span>
                  <PickerField
                    type="date"
                    className="group-value"
                    label="Due date"
                    placeholder="None"
                    value={todo.due ?? ''}
                    display={todo.due ? formatDue(todo.due) : ''}
                    onChange={(value) => onUpdate(todo.id, { due: value || null })}
                  />
                </div>
                <div className="group-row">
                  <span className="glyph glyph-urgent" aria-hidden="true">
                    !
                  </span>
                  <span className="group-label">Urgent</span>
                  <Switch
                    checked={todo.priority}
                    label="Urgent"
                    onChange={(priority) => onUpdate(todo.id, { priority })}
                  />
                </div>
              </div>

              <div className="details-actions">
                <div className="details-moves">
                  {others.map((section) => (
                    <motion.button
                      key={section}
                      type="button"
                      className="text-btn"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onUpdate(todo.id, { section })}
                    >
                      Move to {LIST_NAMES[section]}
                      <ArrowIcon size={14} />
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  type="button"
                  className="text-btn is-danger"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onDelete(todo.id)}
                >
                  <TrashIcon size={14} />
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
