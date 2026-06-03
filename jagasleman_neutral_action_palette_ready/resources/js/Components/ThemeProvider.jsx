import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('resource-theme');
    root.style.colorScheme = 'light';
    document.body.dataset.theme = 'light';

    try {
      window.localStorage.setItem('jagasleman-theme', 'light');
    } catch (error) {
      // noop
    }
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme: () => setTheme('light'),
    toggleTheme: () => setTheme('light'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
