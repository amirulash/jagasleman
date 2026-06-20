import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jagasleman-theme';
const DEFAULT_THEME = 'light';
const THEMES = ['light', 'dark'];

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
});

function normalizeTheme(value) {
  return THEMES.includes(value) ? value : DEFAULT_THEME;
}

function getInitialTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME);
  } catch (error) {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;

  const normalized = normalizeTheme(theme);
  const root = document.documentElement;

  root.classList.add('resource-theme');
  root.classList.toggle('dark', normalized === 'dark');
  root.style.colorScheme = normalized;

  if (document.body) document.body.dataset.theme = normalized;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // localStorage may be unavailable in private mode; the UI can still use the in-memory theme.
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (nextTheme) => setThemeState(normalizeTheme(nextTheme)),
    toggleTheme: () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
