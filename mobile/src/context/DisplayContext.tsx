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
      background:    '#0F0F14',
      surface:       '#1A1A24',
      border:        '#2A2A38',
      textPrimary:   '#EEEEf4',
      textSecondary: '#9999B0',
      textMuted:     '#55556A',
      primary:       '#7B9FE0',
      inputBg:       '#22222E',
      cardShadow:    'transparent',
    } : {
      background:    '#F7F6F2',   // warm parchment white
      surface:       '#FFFFFF',
      border:        '#E8E6E0',
      textPrimary:   '#1A1A2E',   // deep ink
      textSecondary: '#5A5A72',
      textMuted:     '#A0A0B4',
      primary:       '#2C52A0',   // refined navy blue
      inputBg:       '#F0EFE9',
      cardShadow:    '#00000010',
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
