export interface Theme {
  name: 'light' | 'dark';
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  gradient: readonly [string, string];
  income: string;
  expense: string;
  transfer: string;
  danger: string;
  incomeSoft: string;
  expenseSoft: string;
  shadow: string;
}

const light: Theme = {
  name: 'light',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  cardAlt: '#EEF2F8',
  text: '#0B1727',
  muted: '#5D6B82',
  border: '#E3E9F2',
  primary: '#0F766E',
  primarySoft: '#D9F3ED',
  onPrimary: '#FFFFFF',
  gradient: ['#0B6B63', '#12A594'],
  income: '#128A52',
  expense: '#D22E2E',
  transfer: '#4F46E5',
  danger: '#B42318',
  incomeSoft: '#E3F7EC',
  expenseSoft: '#FDE7E7',
  shadow: 'rgba(15, 23, 42, 0.10)',
};

const dark: Theme = {
  name: 'dark',
  bg: '#080E17',
  card: '#111A28',
  cardAlt: '#1A2434',
  text: '#E9EFF8',
  muted: '#94A3B8',
  border: '#223040',
  primary: '#2DD4BF',
  primarySoft: '#0E3B36',
  onPrimary: '#04221F',
  gradient: ['#0C5F58', '#0E8579'],
  income: '#4ADE80',
  expense: '#F87171',
  transfer: '#A5B4FC',
  danger: '#FCA5A5',
  incomeSoft: '#0F2C1D',
  expenseSoft: '#32181A',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export const themes = { light, dark };

export function themeOf(name: 'light' | 'dark'): Theme {
  return name === 'dark' ? dark : light;
}
