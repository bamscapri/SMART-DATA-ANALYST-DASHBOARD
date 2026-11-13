import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ThemeMode,
  ResolvedTheme,
  THEME_STORAGE_KEY,
  resolveThemeMode,
  parseStoredThemeMode,
  getChartThemeTokens,
  ChartThemeTokens
} from '../utils/theme';

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  darkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  chartTheme: ChartThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      return parseStoredThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return 'light';
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());

  // Listen to OS color-scheme changes for System Default mode
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(
    () => resolveThemeMode(themeMode, systemPrefersDark),
    [themeMode, systemPrefersDark]
  );

  // Sync DOM root class and localStorage
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // ignore storage write failures
    }
  }, [themeMode, resolvedTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleDarkMode = () => {
    setThemeModeState(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const chartTheme = useMemo(() => getChartThemeTokens(resolvedTheme), [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        darkMode: resolvedTheme === 'dark',
        setThemeMode,
        toggleDarkMode,
        chartTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
