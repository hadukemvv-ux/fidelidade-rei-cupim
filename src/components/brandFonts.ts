import { Inter, Oswald } from 'next/font/google';

// Identidade "Brasa Premium": título condensado de churrascaria + texto limpo.
// Usada na roleta e nas telas do cliente; a página inicial mantém a fonte própria.
export const displayFont = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
export const bodyFont = Inter({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });

/** Aplicar no elemento raiz da tela: troca as fontes só dentro dela. */
export const brandFontClass = `${displayFont.variable} ${bodyFont.variable} brand-fonts`;
