'use client';

import confetti from 'canvas-confetti';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PrizeWheel from '@/components/roleta/PrizeWheel';
import { prizePhoto } from '@/lib/prizeVisuals';

// Só demonstração na página inicial: nada vai ao servidor, nenhum cupom é gerado.
const PRIZES = [
  { id: 1, tipo: 'saideira', nome: 'Saideira', emoji: '🍺', frase: 'Uma cerveja por nossa conta.' },
  { id: 2, tipo: 'sobremesa', nome: 'Sobremesa do Rei', emoji: '🍮', frase: 'Pudim, brownie ou dindim gourmet.' },
  { id: 3, tipo: 'expulsadeira', nome: 'Expulsadeira', emoji: '🍻', frase: 'Duas cervejas por nossa conta.' },
  { id: 4, tipo: 'frete_gratis', nome: 'Entrega grátis', emoji: '🛵', frase: 'A próxima entrega é por nossa conta.' },
  { id: 5, tipo: 'desconto_presencial_10', nome: '10% presencial', emoji: '🏪', frase: '10% de desconto na próxima compra no salão.' },
  { id: 6, tipo: 'desconto_delivery_10', nome: '10% delivery', emoji: '📦', frase: '10% de desconto no próximo pedido delivery.' },
];

// O modal fica na "camada do topo" do navegador; as faíscas precisam de um canvas dentro dele para aparecer por cima.
function celebrate(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  confetti.create(canvas, { resize: true })({ particleCount: 150, spread: 360, startVelocity: 34, gravity: 0.4, decay: 0.92, scalar: 0.6, ticks: 170, origin: { y: 0.45 },
    colors: ['#ff6a00', '#ff8c1a', '#ffb347', '#ffd27a', '#dc251b'], shapes: ['circle'], disableForReducedMotion: true });
}

export default function HomeRoulette() {
  const [round, setRound] = useState(0);
  const [landed, setLanded] = useState<(typeof PRIZES)[number] | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const sparks = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (landed && !element.open) { element.showModal(); celebrate(sparks.current); }
    if (!landed && element.open) element.close();
  }, [landed]);

  // Fechar (botão, Esc ou toque fora) devolve a roda pronta para outro giro.
  function reset() { setLanded(null); setRound((value) => value + 1); }
  const photo = landed ? prizePhoto(landed) : null;

  return <div className="home-roulette" data-reveal="zoom">
    <div className="home-roulette-wheel">
      <PrizeWheel key={round} prizes={PRIZES}
        onSpinStart={async () => { setNotice(''); return Math.floor(Math.random() * PRIZES.length); }}
        onFinished={(sector) => setLanded(PRIZES[sector] ?? null)}
        onError={setNotice} />
    </div>
    <p className="home-roulette-note">{notice || 'Demonstração: não vale prêmio.'}</p>

    <dialog ref={dialog} className="prize-modal" aria-labelledby="prize-modal-title" onClose={reset}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <canvas ref={sparks} className="prize-modal-sparks" aria-hidden="true" />
      {landed && <div className="prize-modal-inner">
        <button type="button" className="prize-modal-close" aria-label="Fechar" onClick={() => dialog.current?.close()}>×</button>
        <div className="prize-modal-art">
          {photo ? <Image src={photo} alt="" width={260} height={260} /> : <span aria-hidden="true">{landed.emoji}</span>}
        </div>
        <p className="prize-modal-kicker">Você ganhou</p>
        <h3 id="prize-modal-title">{landed.nome}</h3>
        <p className="prize-modal-copy">{landed.frase}</p>
        <div className="prize-modal-actions">
          <Link href="/cadastro" className="button button-primary">Entrar para o clube <span aria-hidden="true">→</span></Link>
          <button type="button" className="prize-modal-again" onClick={() => dialog.current?.close()}>Girar de novo</button>
        </div>
        <small>Demonstração da Roleta do Rei: este giro não vale prêmio.</small>
      </div>}
    </dialog>
  </div>;
}
