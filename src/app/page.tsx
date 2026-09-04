'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { getAllNivelThresholds, type NivelFidelidade } from '@/lib/fidelidade-rules';

const levels = getAllNivelThresholds();
const levelCopy: Record<NivelFidelidade, { label: string; text: string }> = {
  BRONZE: { label: 'Sua porta de entrada', text: 'Cadastre-se grátis e já comece a acumular pontos e tickets.' },
  PRATA: { label: 'A chama cresceu', text: 'Mais pontos, cashback e duas chances na roleta a cada R$ 100.' },
  OURO: { label: 'Cliente da casa', text: 'Quatro pontos por real e recompensas ainda mais rápidas.' },
  REI: { label: 'O topo da brasa', text: 'O maior retorno do clube para quem sempre volta.' },
};

const dishes = [
  { src: '/images/home/espetinhos.webp', name: 'Espetinhos Gourmet', tag: 'Da brasa' },
  { src: '/images/home/feijao-verde.webp', name: 'Feijão Verde do Rei', tag: 'Da casa' },
  { src: '/images/home/caranguejada.webp', name: 'Caranguejada do Rei', tag: 'Especial' },
  { src: '/images/home/burgers.webp', name: 'Burgers do Rei', tag: 'Favorito' },
];

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

function percent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<NivelFidelidade>('BRONZE');
  const level = levels.find((item) => item.nivel === selectedLevel) ?? levels[0];

  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="hero-title">
        <Image src="/images/home/hero-cupim.webp" alt="Cupim assado na brasa servido com acompanhamento" fill priority sizes="100vw" className="hero-photo" />
        <div className="hero-shade" />

        <header className="hero-header">
          <Link href="/" className="brand" aria-label="O Rei do Cupim — início">
            <Image src="/logo.png" alt="" width={54} height={54} priority />
            <span><small>CHURRASCARIA</small><strong>O Rei do Cupim</strong></span>
          </Link>
          <Link href="/resgate" className="header-login">Já sou cliente</Link>
        </header>

        <div className="hero-content">
          <p className="eyebrow"><span /> Clube de vantagens</p>
          <h1 id="hero-title">Seu sabor de sempre.<br /><em>Agora rende mais.</em></h1>
          <p className="hero-copy">Coma bem, acumule pontos e transforme cada visita em novas recompensas.</p>
          <div className="hero-actions">
            <Link href="/cadastro" className="button button-primary">Entrar para o clube <span aria-hidden="true">→</span></Link>
            <Link href="/resgate" className="button button-ghost">Consultar meus pontos</Link>
          </div>
          <div className="hero-proof"><strong>Cadastro grátis</strong><span>Você pontua desde a primeira compra</span></div>
        </div>

        <a className="scroll-cue" href="#como-funciona" aria-label="Ver como funciona"><span>Descubra o clube</span><i aria-hidden="true">↓</i></a>
      </section>

      <div className="benefit-ribbon" aria-label="Benefícios do clube">
        <div><span>Pontos</span><i>•</i><span>Cashback</span><i>•</i><span>Roleta de prêmios</span><i>•</i><span>Recompensas</span></div>
      </div>

      <section id="como-funciona" className="how-section section-pad">
        <div className="section-heading dark-heading">
          <p className="kicker">Feito para quem sempre volta</p>
          <h2>Quanto mais sabor,<br /><em>mais benefícios.</em></h2>
          <p className="section-intro">Sem cartão para carregar. Suas compras constroem seu nível e deixam a próxima recompensa mais perto.</p>
        </div>

        <ol className="steps">
          <li><span>01</span><div><h3>Entre para o clube</h3><p>Faça seu cadastro gratuito em poucos instantes.</p></div></li>
          <li><span>02</span><div><h3>Compre e acumule</h3><p>Suas compras elegíveis viram pontos, cashback e tickets.</p></div></li>
          <li><span>03</span><div><h3>Aproveite</h3><p>Troque seus pontos e use suas chances na roleta.</p></div></li>
        </ol>
      </section>

      <section className="levels-section section-pad" aria-labelledby="levels-title">
        <div className="section-heading light-heading">
          <p className="kicker">Uma jornada em quatro níveis</p>
          <h2 id="levels-title">Sua fidelidade<br /><em>vale mais.</em></h2>
          <p className="section-intro">Seu nível acompanha o total de compras elegíveis dos últimos 90 dias.</p>
        </div>

        <div className="level-tabs" role="tablist" aria-label="Níveis do programa">
          {levels.map((item) => (
            <button key={item.nivel} type="button" role="tab" aria-selected={selectedLevel === item.nivel} aria-controls="level-panel" onClick={() => setSelectedLevel(item.nivel)}>
              <small>{item.nivel}</small><strong>{item.nome}</strong>
            </button>
          ))}
        </div>

        <div className="level-panel" id="level-panel" role="tabpanel">
          <div className="level-overview">
            <p>{levelCopy[level.nivel].label}</p>
            <h3>{level.nome}</h3>
            <span>{level.min === 0 ? 'Começa no cadastro' : `A partir de ${money(level.min)} em 90 dias`}</span>
            <p className="level-description">{levelCopy[level.nivel].text}</p>
          </div>
          <div className="level-metrics">
            <article><strong>{level.beneficio.pontos}x</strong><span>pontos por real</span></article>
            <article><strong>{percent(level.beneficio.cashback)}</strong><span>de cashback</span></article>
            <article><strong>{level.beneficio.tickets}</strong><span>{level.beneficio.tickets === 1 ? 'ticket' : 'tickets'} a cada R$ 100</span></article>
          </div>
          <p className="points-note">100 pontos valem R$ 1 em produtos. A compra usa os benefícios do nível que você tinha antes dela.</p>
        </div>
      </section>

      <section className="food-section section-pad" aria-labelledby="food-title">
        <div className="food-heading">
          <p className="kicker">Direto da nossa cozinha</p>
          <h2 id="food-title">Tem recompensa.<br /><em>Tem comida de verdade.</em></h2>
        </div>
        <div className="food-grid">
          {dishes.map((dish, index) => (
            <article className={`dish-card dish-${index + 1}`} key={dish.name}>
              <Image src={dish.src} alt={dish.name} fill sizes="(max-width: 699px) 88vw, 45vw" />
              <div><span>{dish.tag}</span><h3>{dish.name}</h3></div>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <Image src="/images/home/espetinhos.webp" alt="Espetinhos gourmet assados" fill sizes="100vw" />
        <div className="final-shade" />
        <div className="final-content">
          <Image src="/logo.png" alt="" width={72} height={72} />
          <p className="kicker">A brasa já está acesa</p>
          <h2>Seu próximo pedido<br /><em>já pode valer pontos.</em></h2>
          <div className="final-actions">
            <Link href="/cadastro" className="button button-primary">Quero fazer parte <span aria-hidden="true">→</span></Link>
            <a href="https://wa.me/5585988257044" target="_blank" rel="noopener noreferrer" className="text-link">Pedir pelo WhatsApp</a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><Image src="/logo.png" alt="" width={42} height={42} /><span><strong>O Rei do Cupim</strong><small>Fortaleza · Ceará</small></span></div>
        <nav aria-label="Links do rodapé">
          <a href="https://www.instagram.com/oreidocupim_/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4" target="_blank" rel="noopener noreferrer">iFood</a>
          <Link href="/admin">Área administrativa</Link>
        </nav>
      </footer>
    </main>
  );
}
