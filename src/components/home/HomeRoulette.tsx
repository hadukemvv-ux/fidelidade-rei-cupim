'use client';

import { useState } from 'react';
import PrizeWheel from '@/components/roleta/PrizeWheel';

// Só demonstração na página inicial: nada vai ao servidor, nenhum cupom é gerado.
const PRIZES = [
  { id: 1, tipo: 'saideira', nome: 'Saideira', emoji: '🍺' },
  { id: 2, tipo: 'sobremesa', nome: 'Sobremesa do Rei', emoji: '🍮' },
  { id: 3, tipo: 'expulsadeira', nome: 'Expulsadeira', emoji: '🍻' },
  { id: 4, tipo: 'frete_gratis', nome: 'Entrega grátis', emoji: '🛵' },
  { id: 5, tipo: 'desconto_presencial_10', nome: '10% presencial', emoji: '🏪' },
  { id: 6, tipo: 'desconto_delivery_10', nome: '10% delivery', emoji: '📦' },
];

export default function HomeRoulette() {
  const [round, setRound] = useState(0);
  const [landed, setLanded] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  return <div className="home-roulette" data-reveal="zoom">
    <div className="home-roulette-wheel">
      <PrizeWheel key={round} prizes={PRIZES}
        onSpinStart={async () => { setLanded(null); setNotice(''); return Math.floor(Math.random() * PRIZES.length); }}
        onFinished={(sector) => setLanded(PRIZES[sector]?.nome ?? null)}
        onError={setNotice} />
    </div>
    <div className="home-roulette-result" aria-live="polite">
      {landed ? <>
        <p>Caiu em</p>
        <strong>{landed}</strong>
        <button type="button" onClick={() => { setLanded(null); setRound((value) => value + 1); }}>Girar de novo</button>
      </> : <p>{notice || 'Gire com o dedo ou toque em Girar.'}</p>}
      <small>Demonstração: não vale prêmio.</small>
    </div>
  </div>;
}
