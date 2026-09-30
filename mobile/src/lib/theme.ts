import { useColorScheme } from 'react-native';

const light = {
  bg: '#f6f3ff',
  card: '#ffffff',
  text: '#1e1b2e',
  muted: '#6b6685',
  primary: '#6c5ce7',
  onPrimary: '#ffffff',
  accent: '#ffd166',
  danger: '#e63946',
  border: '#e4def7',
};

const dark: typeof light = {
  ...light,
  bg: '#14121f',
  card: '#1f1c30',
  text: '#f1eefc',
  muted: '#a39dbf',
  primary: '#8f7fff',
  border: '#332e4d',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
