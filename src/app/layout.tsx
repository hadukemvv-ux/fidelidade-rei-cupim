import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'Clube Rei do Cupim | Pontos e recompensas',
  description: 'Entre para o Clube Rei do Cupim, acumule pontos nas suas compras e troque por recompensas.',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
