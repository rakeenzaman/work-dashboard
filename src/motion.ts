import type { Transition } from 'motion/react';

/** Snappy, critically-damped spring used for most layout movement. */
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 };
/** Softer spring for larger surfaces (cards, panels). */
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 30 };
/** Apple's signature ease-out curve. */
export const easeOut = [0.32, 0.72, 0, 1] as const;

/** Height-collapse variants for disclosure panels. */
export const collapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { height: softSpring, opacity: { duration: 0.2, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.28, ease: easeOut }, opacity: { duration: 0.12 } } },
};

/** Enter/exit/reflow animation shared by list items. */
export const listItem = {
  layout: 'position' as const,
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
  transition: spring,
};
