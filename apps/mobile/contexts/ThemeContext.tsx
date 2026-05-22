import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  tabBar: string;
  tabBorder: string;
  header: string;
  inputBg: string;
  inputBorder: string;
  iconBg: string;
}

const LIGHT: ThemeColors = {
  bg: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  accent: '#2563EB',
  tabBar: '#FFFFFF',
  tabBorder: '#F3F4F6',
  header: '#FFFFFF',
  inputBg: '#F3F4F6',
  inputBorder: '#2563EB',
  iconBg: '#EFF6FF',
};

const DARK: ThemeColors = {
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',
  border: '#3A3A3C',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  accent: '#2563EB',
  tabBar: '#1C1C1E',
  tabBorder: '#3A3A3C',
  header: '#000000',
  inputBg: '#2C2C2E',
  inputBorder: '#2563EB',
  iconBg: '#1A2A4A',
};

interface ThemeState {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const STORE_KEY = 'app_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((val) => {
      if (val === 'dark' || val === 'light') setThemeState(val);
    }).catch(() => {});
  }, []);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    SecureStore.setItemAsync(STORE_KEY, mode).catch(() => {});
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ theme, colors: theme === 'dark' ? DARK : LIGHT, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
