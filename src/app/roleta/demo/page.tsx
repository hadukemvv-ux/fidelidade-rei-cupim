import type { Metadata } from 'next';
import DemoRoleta from './DemoRoleta';

export const metadata: Metadata = {
  title: 'Roleta — demonstração | Clube Cupim',
  robots: { index: false, follow: false },
};

export default function RoletaDemoPage() {
  return <DemoRoleta />;
}
