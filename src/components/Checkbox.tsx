import { motion } from 'motion/react';

interface Props {
  checked: boolean;
  label: string;
  onToggle: () => void;
}

/** Reminders-style ring that fills with the section accent and draws a check on completion. */
export function Checkbox({ checked, label, onToggle }: Props) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="check"
      onClick={onToggle}
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="10.25" className="check-ring" />
        <motion.circle
          cx="12"
          cy="12"
          r="10.25"
          className="check-fill"
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22 }}
          style={{ originX: '50%', originY: '50%' }}
        />
        <motion.path
          d="M7.5 12.4l3 3 6-6.6"
          className="check-mark"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, delay: checked ? 0.08 : 0, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
    </motion.button>
  );
}
