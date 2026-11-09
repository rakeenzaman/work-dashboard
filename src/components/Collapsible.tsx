import { useEffect, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ChevronIcon } from './icons';
import { spring } from '../motion';

/** At this width and below (phone, small tablet) the work-only sections can be folded away. */
const COMPACT = '(max-width: 860px)';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setMatches(list.matches);
    change();
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, [query]);
  return matches;
}

function readCollapsed(key: string) {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
}

/**
 * A section that folds on small screens. Starts folded there (these are desk tools), and the choice
 * is remembered per device under `storageKey`. On larger screens it's always open.
 */
export function useCollapsible(storageKey: string) {
  const compact = useMediaQuery(COMPACT);
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(storageKey, String(!c));
      } catch {
        // Storage unavailable (private mode): the choice just isn't remembered.
      }
      return !c;
    });
  }

  return { compact, open: !compact || !collapsed, toggle };
}

interface FoldButtonProps {
  open: boolean;
  onToggle: () => void;
  /** What's being folded, for screen readers, e.g. "time tracking". */
  label: string;
  /** id of the element it shows and hides. */
  controls: string;
}

/** The chevron that folds a section: points right when folded, down when open. */
export function FoldButton({ open, onToggle, label, controls }: FoldButtonProps) {
  return (
    <motion.button
      type="button"
      className="fold-btn"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      onClick={(e: MouseEvent) => {
        // The header around it toggles too; don't toggle twice.
        e.stopPropagation();
        onToggle();
      }}
      animate={{ rotate: open ? 90 : 0 }}
      whileTap={{ scale: 0.85 }}
      transition={spring}
    >
      <ChevronIcon size={15} strokeWidth={2.4} />
    </motion.button>
  );
}
