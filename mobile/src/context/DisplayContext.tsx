import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SCALE: Record<FontSize, { body: number; verse: number; heading: number; label: number }> = {
  small:  { body: 13, verse: 14, heading: 16, label: 12 },
  medium: { body: 15, verse: 16, heading: 18, label: 14 },
  large:  { body: 18, verse: 19, heading: 22, label: 16 },
};

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    inputBg: string;
    cardShadow: string;
  };
  font: { body: number; verse: number; heading: number; label: number };
}

function buildTheme(dark: boolean, fontSize: FontSize): Theme {
  return {
    dark,
    colors: dark ? {
      background:    '#121212',
      surface:       '#1e1e1e',
      border:        '#333',
      textPrimary:   '#f0f0f0',
      textSecondary: '#bbb',
      textMuted:     '#777',
      primary:       '#90caf9',
      inputBg:       '#2a2a2a',
      cardShadow:    'transparent',
    } : {
      background:    '#f5f5f5',
      surface:       '#ffffff',
      border:        '#e0e0e0',
      textPrimary:   '#212121',
      textSecondary: '#555',
      textMuted:     '#aaa',
      primary:       '#1976d2',
      inputBg:       '#fafafa',
      cardShadow:    '#000',
    },
    font: FONT_SCALE[fontSize],
  };
}

interface DisplayContextValue {
  theme: Theme;
  fontSize: FontSize;
  toggleDarkMode: () => void;
  setFontSize: (s: FontSize) => void;
}

const DisplayContext = createContext<DisplayContextValue>({} as DisplayContextValue);

const STORAGE_KEY = 'displaySettings';

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      const { dark, fontSize: fs } = JSON.parse(raw);
      if (typeof dark === 'boolean') setIsDark(dark);
      if (fs) setFontSizeState(fs);
    });
  }, []);

  const persist = (dark: boolean, fs: FontSize) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dark, fontSize: fs }));

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    persist(next, fontSize);
  };

  const setFontSize = (fs: FontSize) => {
    setFontSizeState(fs);
    persist(isDark, fs);
  };

  return (
    <DisplayContext.Provider value={{ theme: buildTheme(isDark, fontSize), fontSize, toggleDarkMode, setFontSize }}>
      {children}
    </DisplayContext.Provider>
  );
}

export const useDisplay = () => useContext(DisplayContext);
