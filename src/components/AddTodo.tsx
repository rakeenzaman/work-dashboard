import { useRef, useState, type FocusEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarIcon, PlusIcon } from './icons';
import { collapse, spring } from '../motion';
import { formatDue, todayKey } from '../dates';
import { PickerField } from './PickerField';
import type { Section, TodoInput } from '../types';

interface Props {
  section: Section;
  onAdd: (input: TodoInput) => Promise<boolean>;
}

export function AddTodo({ section, onAdd }: Props) {
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0;
  const showOptions = focused || canSubmit || due !== '' || urgent;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onAdd({
      text: text.trim(),
      section,
      due: due || null,
      priority: urgent,
    });
    if (!ok) return;
    setText('');
    setDue('');
    setUrgent(false);
    inputRef.current?.focus();
  }

  function handleBlur(e: FocusEvent<HTMLFormElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  }

  return (
    <form className="add" onSubmit={submit} onFocus={() => setFocused(true)} onBlur={handleBlur}>
      <div className="add-row">
        <span className="add-plus" aria-hidden="true">
          <PlusIcon size={14} strokeWidth={2.6} />
        </span>
        <input
          ref={inputRef}
          className="add-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          placeholder="New Reminder"
          aria-label={`New ${section === 'work' ? 'work' : 'life'} reminder`}
          maxLength={500}
        />
        <AnimatePresence>
          {canSubmit && (
            <motion.button
              type="submit"
              className="add-submit"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileTap={{ scale: 0.92 }}
              transition={spring}
            >
              Add
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {showOptions && (
          <motion.div className="add-options-wrap" {...collapse}>
            <div className="add-options">
              <PickerField
                type="date"
                className="pill"
                icon={<CalendarIcon size={14} />}
                label="Due date"
                placeholder="Date"
                value={due}
                min={todayKey()}
                display={due ? formatDue(due) : ''}
                onChange={setDue}
              />
              <motion.button
                type="button"
                className={`pill pill-urgent ${urgent ? 'is-set' : ''}`}
                aria-pressed={urgent}
                onClick={() => setUrgent((u) => !u)}
                whileTap={{ scale: 0.94 }}
              >
                <span className="pill-siren" aria-hidden="true">
                  ❗
                </span>
                <span>Urgent</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
