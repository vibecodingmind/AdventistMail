'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'teal';

const ThemeContext = createContext<{
  theme: Theme;
  accent: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentColor) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark';
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [accent, setAccentState] = useState<AccentColor>('emerald');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const updateTheme = (themeValue: Theme) => {
    let actualTheme: 'light' | 'dark';
    
    if (themeValue === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'dark' : 'light';
    } else {
      actualTheme = themeValue;
    }
    
    setResolvedTheme(actualTheme);
    document.documentElement.classList.toggle('dark', actualTheme === 'dark');
    
    // Update CSS variables for accent color
    const root = document.documentElement;
    root.style.setProperty('--accent-color', getAccentColor(accent));
    root.style.setProperty('--accent-color-hover', getAccentColorHover(accent));
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const savedAccent = localStorage.getItem('accent') as AccentColor | null;
    const initialTheme = saved || 'system';
    const initialAccent = savedAccent || 'emerald';
    
    setThemeState(initialTheme);
    setAccentState(initialAccent);
    updateTheme(initialTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    updateTheme(theme);
  }, [theme, accent]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    updateTheme(newTheme);
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    localStorage.setItem('accent', newAccent);
    updateTheme(theme);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent, toggleTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Helper function to get accent color values
function getAccentColor(accent: AccentColor): string {
  const colors = {
    emerald: '#10b981',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    rose: '#f43f5e',
    amber: '#f59e0b',
    teal: '#14b8a6',
  };
  return colors[accent];
}

function getAccentColorHover(accent: AccentColor): string {
  const colors = {
    emerald: '#059669',
    blue: '#2563eb',
    violet: '#7c3aed',
    rose: '#e11d48',
    amber: '#d97706',
    teal: '#0d9488',
  };
  return colors[accent];
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
