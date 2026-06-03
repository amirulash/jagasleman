import { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyLightTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('resource-theme');
  root.classList.remove('dark');
  root.style.colorScheme = 'light';
  if (document.body) document.body.dataset.theme = 'light';
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem('jagasleman-theme');
    } catch (error) {
      // noop
    }
    applyLightTheme();
  }, []);

  const value = useMemo(() => ({
    theme: 'light',
    setTheme: applyLightTheme,
    toggleTheme: applyLightTheme,
  }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
