import { motion } from 'motion/react';

interface Props {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, label, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <motion.span
        className="switch-knob"
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 35 }}
        whileTap={{ width: 28 }}
      />
    </button>
  );
}
