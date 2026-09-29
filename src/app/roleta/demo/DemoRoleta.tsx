'use client';

import RoletaExperience, { type SpinResult } from '@/components/roleta/RoletaExperience';

// Prêmios fictícios para ensaiar a experiência. Nada é enviado ao servidor.
const PRIZES = [
  { nome: 'Saideira', emoji: '🍺', descricao_vitoria: 'Você ganhou uma cerveja.' },
  { nome: 'Sobremesa do Rei', emoji: '🍮', descricao_vitoria: 'Escolha pudim, brownie ou dindim gourmet.' },
  { nome: 'Expulsadeira', emoji: '🍻', descricao_vitoria: 'Você ganhou duas cervejas.' },
  { nome: 'Taxa de entrega grátis', emoji: '🛵', descricao_vitoria: 'A próxima entrega é por nossa conta.' },
  { nome: '10% presencial', emoji: '🏪', descricao_vitoria: '10% na sua próxima compra no salão.' },
  { nome: 'Sobremesa do Rei', emoji: '🍮', descricao_vitoria: 'Escolha pudim, brownie ou dindim gourmet.' },
];

async function fakeSpin(): Promise<SpinResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  const premio = PRIZES[Math.floor(Math.random() * PRIZES.length)];
  return { premio, cupom: 'DEMO-0000', expira_em: new Date(Date.now() + 14 * 86400000).toISOString(), modo_teste: false };
}

export default function DemoRoleta() {
  return <RoletaExperience prizes={PRIZES} requestSpin={fakeSpin} demo />;
}
