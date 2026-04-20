import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'ppc-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'light') html.setAttribute('data-theme', 'light');
  else html.removeAttribute('data-theme');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggle = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggle };
}

// Apply stored theme as early as possible so the first paint is correct.
export function initThemeOnLoad() {
  if (typeof document === 'undefined') return;
  applyTheme(readStoredTheme());
}
