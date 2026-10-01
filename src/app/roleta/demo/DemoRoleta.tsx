'use client';

import RoletaExperience, { type SpinResult } from '@/components/roleta/RoletaExperience';

// Prêmios fictícios para ensaiar a experiência. Nada é enviado ao servidor.
const PRIZES = [
  { id: 1, tipo: 'saideira', nome: 'Saideira', emoji: '🍺', descricao_vitoria: 'Você ganhou uma cerveja.' },
  { id: 2, tipo: 'sobremesa', nome: 'Sobremesa do Rei', emoji: '🍮', descricao_vitoria: 'Escolha pudim, brownie ou dindim gourmet.' },
  { id: 3, tipo: 'expulsadeira', nome: 'Expulsadeira', emoji: '🍻', descricao_vitoria: 'Você ganhou duas cervejas.' },
  { id: 4, tipo: 'frete_gratis', nome: 'Taxa de entrega grátis', emoji: '🛵', descricao_vitoria: 'A próxima entrega é por nossa conta.' },
  { id: 5, tipo: 'desconto_presencial_10', nome: '10% presencial', emoji: '🏪', descricao_vitoria: '10% na sua próxima compra no salão.' },
  { id: 2, tipo: 'sobremesa', nome: 'Sobremesa do Rei', emoji: '🍮', descricao_vitoria: 'Escolha pudim, brownie ou dindim gourmet.' },
];

async function fakeSpin(): Promise<SpinResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  const premio = PRIZES[Math.floor(Math.random() * PRIZES.length)];
  return { premio, cupom: 'DEMO-0000', expira_em: new Date(Date.now() + 14 * 86400000).toISOString(), modo_teste: false };
}

export default function DemoRoleta() {
  return <RoletaExperience prizes={PRIZES} requestSpin={fakeSpin} demo />;
}
