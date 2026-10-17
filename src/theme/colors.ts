import { useColorScheme } from 'react-native';

// "Blue track": paper and ink with a running-track blue. The lane colors are
// for the stage panel, which is always deep blue regardless of scheme.
export interface Palette {
  background: string;
  card: string;
  text: string;
  secondary: string;
  line: string;
  accent: string;
  onAccent: string;
  walk: string;
  danger: string;
  warning: string;
  track: string;
  lane: string;
  onLane: string;
  onLaneMuted: string;
  laneWalk: string;
  laneLine: string;
}

const light: Palette = {
  background: '#F2F5FA',
  card: '#FFFFFF',
  text: '#0B1D3A',
  secondary: '#4F5F7A',
  line: '#D9E1EE',
  accent: '#2050C8',
  onAccent: '#FFFFFF',
  walk: '#B5C7EC',
  danger: '#B42318',
  warning: '#A65E00',
  track: '#E3E9F4',
  lane: '#163C9E',
  onLane: '#FFFFFF',
  onLaneMuted: '#C8D5F4',
  laneWalk: '#4467C0',
  laneLine: '#3A5DB8',
};

const dark: Palette = {
  background: '#071327',
  card: '#0E1F3B',
  text: '#E8EEF8',
  secondary: '#9AABC8',
  line: '#1E3255',
  accent: '#7FA6FF',
  onAccent: '#06122A',
  walk: '#2A4677',
  danger: '#FF8A80',
  warning: '#F0A848',
  track: '#16294A',
  lane: '#14357F',
  onLane: '#FFFFFF',
  onLaneMuted: '#B9C9EE',
  laneWalk: '#3A5AA8',
  laneLine: '#2E4E9C',
};

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
