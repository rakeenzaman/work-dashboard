import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { XIcon } from './icons';
import { openPicker } from '../openPicker';

interface Props {
  type: 'date' | 'datetime-local';
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Friendly rendering of `value`, e.g. "Tomorrow, 9:00 AM". */
  display: string;
  placeholder: string;
  icon?: ReactNode;
  min?: string;
  className?: string;
}

/** Shows a friendly value; an invisible native input on top supplies the system picker. */
export function PickerField({ type, value, onChange, label, display, placeholder, icon, min, className = '' }: Props) {
  return (
    <span className={`picker ${value ? 'is-set' : ''} ${className}`}>
      {icon}
      <span className="picker-text">{value ? display : placeholder}</span>
      <input
        type={type}
        className="picker-input"
        value={value}
        min={min}
        aria-label={label}
        onClick={openPicker}
        onChange={(e) => onChange(e.target.value)}
      />
      <AnimatePresence initial={false}>
        {value && (
          <motion.button
            type="button"
            className="picker-clear"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange('')}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          >
            <XIcon size={10} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  );
}
