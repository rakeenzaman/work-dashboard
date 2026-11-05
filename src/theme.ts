import { useEffect, useLayoutEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const query = () => window.matchMedia('(prefers-color-scheme: dark)');

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Light/dark theme: follows the OS until the user picks one, then remembers the pick. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => stored() ?? (query().matches ? 'dark' : 'light'));

  // Layout effect so the attribute flips inside the same commit (needed for the view transition snapshot).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const mq = query();
    const onChange = () => {
      if (!stored()) setThemeState(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice just won't persist.
    }
    setThemeState(next);
  };

  return [theme, setTheme];
}
