import { Inter, Oswald } from 'next/font/google';

// Brasa Premium: título condensado de churrascaria + texto limpo.
export const displayFont = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
export const bodyFont = Inter({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });
