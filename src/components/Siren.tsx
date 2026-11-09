import { useMemo, type CSSProperties } from 'react';

/** The ❗ breathing loop. Keep in sync with styles.css. */
const SIREN_PERIOD = 2400;

/**
 * Negative animation delay that locks a newly mounted urgent row onto a shared clock,
 * so every urgent item moves in unison. Recomputed whenever `active` flips on.
 */
export function useSirenPhase(active: boolean): CSSProperties {
  const delay = useMemo(() => -(performance.now() % SIREN_PERIOD), [active]);
  return { '--siren-delay': `${delay}ms` } as CSSProperties;
}

/** A gently breathing ❗. */
export function Siren() {
  return (
    <span className="siren" role="img" aria-label="Urgent">
      <span className="siren-emoji" aria-hidden="true">
        ❗
      </span>
    </span>
  );
}
