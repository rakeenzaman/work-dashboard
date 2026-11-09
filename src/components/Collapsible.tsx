import { useEffect, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ChevronIcon } from './icons';
import { spring } from '../motion';

/** At this width and below (phone, small tablet) sections can be folded away. */
const COMPACT = '(max-width: 860px)';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setMatches(list.matches);
    change();
    // `change` covers normal resizes and rotation; `resize` is a backstop where it doesn't fire.
    list.addEventListener('change', change);
    window.addEventListener('resize', change);
    return () => {
      list.removeEventListener('change', change);
      window.removeEventListener('resize', change);
    };
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
 * A section that folds on small screens; on larger screens it's always open.
 * With a `storageKey` it starts folded (desk tools) and the choice is remembered per device under it.
 * With `null` it opens fresh every time the app loads.
 */
export function useCollapsible(storageKey: string | null) {
  const compact = useMediaQuery(COMPACT);
  const [collapsed, setCollapsed] = useState(() => (storageKey ? readCollapsed(storageKey) : false));

  function toggle() {
    setCollapsed((c) => {
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(!c));
        } catch {
          // Storage unavailable (private mode): the choice just isn't remembered.
        }
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
      // Starts at its resting angle, so a section that loads open already points down.
      initial={false}
      animate={{ rotate: open ? 90 : 0 }}
      whileTap={{ scale: 0.85 }}
      transition={spring}
    >
      <ChevronIcon size={15} strokeWidth={2.4} />
    </motion.button>
  );
}
