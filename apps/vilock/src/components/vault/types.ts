import { ColorType } from '../../types/colors';

export type { ColorType };

export const colorStyles = {
  green: { border: 'border-cpc-green-500', text: 'text-cpc-green-500', bg: 'bg-cpc-green-500' },
  red: { border: 'border-cpc-red-500', text: 'text-cpc-red-500', bg: 'bg-cpc-red-500' },
  cyan: { border: 'border-cpc-cyan-500', text: 'text-cpc-cyan-500', bg: 'bg-cpc-cyan-500' },
  yellow: { border: 'border-cpc-yellow-500', text: 'text-cpc-yellow-500', bg: 'bg-cpc-yellow-500' },
  magenta: {
    border: 'border-cpc-magenta-500',
    text: 'text-cpc-magenta-500',
    bg: 'bg-cpc-magenta-500',
  },
};

export interface EntryFormData {
  name: string;
  username: string;
  password: string;
  url: string;
}
