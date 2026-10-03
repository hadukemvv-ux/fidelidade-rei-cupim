'use client';

import Image from 'next/image';
import Link from 'next/link';
import DishCarousel from '@/components/home/DishCarousel';
import HomeRoulette from '@/components/home/HomeRoulette';
import LevelSimulator from '@/components/home/LevelSimulator';
import { useScrollReveal } from '@/components/home/useScrollReveal';
import { MENSAGEM_BENEFICIOS_CLUBE } from '@/lib/fidelidade-rules';

const dishes = [
  { src: '/images/home/cupim-trinchado.webp', name: 'Cupim do Rei', tag: 'O clássico', position: '50% 45%' },
  { src: '/images/home/espetinhos.webp', name: 'Espetinhos Gourmet', tag: 'Da brasa', position: '50% 65%' },
  { src: '/images/home/feijao-verde.webp', name: 'Feijão Verde do Rei', tag: 'Da casa', position: '58% 42%' },
  { src: '/images/home/caranguejada.webp', name: 'Caranguejada do Rei', tag: 'Especial', position: '52% 36%' },
  { src: '/images/home/burgers.webp', name: 'Burgers do Rei', tag: 'Favorito', position: '50% 48%' },
];

export default function Home() {
  useScrollReveal();
  return (
    <main className="home-shell">
      <noscript><style>{`[data-reveal]{opacity:1;translate:none;scale:none}`}</style></noscript>
      <section className="hero" aria-labelledby="hero-title">
        <Image src="/images/home/cupim-trinchado.webp" alt="Cupim assado na brasa servido com acompanhamento" fill priority sizes="100vw" className="hero-photo" />
        <div className="hero-shade" />

        <header className="hero-header">
          <Link href="/" className="brand" aria-label="O Rei do Cupim — início">
            <Image src="/logo.png" alt="" width={54} height={54} priority />
            <span><small>CHURRASCARIA</small><strong>O Rei do Cupim</strong></span>
          </Link>
          <div className="header-actions">
            <nav className="header-socials" aria-label="Pedidos e redes sociais">
              <a className="header-social header-ifood" href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4?utm_medium=share" target="_blank" rel="noopener noreferrer" aria-label="Pedir no iFood" title="iFood">iFood</a>
              <a className="header-social header-food99" href="https://oia.99app.com/dlp9/RQpH0q" target="_blank" rel="noopener noreferrer" aria-label="Pedir no 99Food" title="99Food">99</a>
              <a className="header-social header-whatsapp" href="https://wa.me/5585988257044" target="_blank" rel="noopener noreferrer" aria-label="Pedir pelo WhatsApp" title="WhatsApp">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L4 20.2l1.1-4a8.4 8.4 0 1 1 15.4-4.4Z"/><path d="M9 8.1c.3-.3.6-.2.8.1l.8 1.8c.1.3 0 .5-.2.7l-.6.6c.7 1.4 1.8 2.5 3.2 3.2l.6-.7c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.4.3.7-.2 1-1.1 1.6-2.1 1.6-3.5 0-7.1-3.6-7.1-7.1 0-.6.3-1.2.8-1.5Z"/></svg>
              </a>
              <a className="header-social header-instagram" href="https://www.instagram.com/oreidocupim_/" target="_blank" rel="noopener noreferrer" aria-label="Ver Instagram" title="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" className="fill"/></svg>
              </a>
            </nav>
            <Link href="/resgate" className="header-login"><span className="login-long">Já sou cliente</span><span className="login-short">Entrar</span></Link>
          </div>
        </header>

        <div className="hero-content">
          <p className="eyebrow"><span /> Clube de vantagens</p>
          <h1 id="hero-title">Seu sabor de sempre.<br /><em>Agora rende mais.</em></h1>
          <p className="hero-copy">{MENSAGEM_BENEFICIOS_CLUBE}</p>
          <div className="hero-actions">
            <Link href="/cadastro" className="button button-primary">Entrar para o clube <span aria-hidden="true">→</span></Link>
            <Link href="/resgate" className="button button-ghost">Consultar meus pontos</Link>
          </div>
          <div className="hero-proof"><strong>Cadastro grátis</strong><span>Você pontua desde a primeira compra</span></div>
        </div>

        <a className="scroll-cue" href="#como-funciona" aria-label="Ver como funciona"><span>Descubra o clube</span><i aria-hidden="true">↓</i></a>
      </section>

      <div className="benefit-ribbon" aria-label="Benefícios do clube">
        <div><span>Pontos</span><i>•</i><span>Cashback</span><i>•</i><span>Benefícios</span><i>•</i><span>Recompensas</span></div>
      </div>

      <section id="como-funciona" className="how-section section-pad">
        <div className="section-heading dark-heading" data-reveal="left">
          <p className="kicker">Feito para quem sempre volta</p>
          <h2>Quanto mais sabor,<br /><em>mais benefícios.</em></h2>
          <p className="section-intro">Sem cartão para carregar. Suas compras constroem seu nível e deixam a próxima recompensa mais perto.</p>
        </div>

        <ol className="steps">
          <li data-reveal="up"><span>01</span><div><h3>Entre para o clube</h3><p>Faça seu cadastro gratuito em poucos instantes.</p></div></li>
          <li data-reveal="up" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}><span>02</span><div><h3>Compre e acumule</h3><p>Suas compras elegíveis viram pontos e cashback.</p></div></li>
          <li data-reveal="up" style={{ '--reveal-delay': '240ms' } as React.CSSProperties}><span>03</span><div><h3>Aproveite</h3><p>Troque seus pontos por benefícios e acompanhe as novidades do Clube.</p></div></li>
        </ol>
      </section>

      <section className="video-section section-pad" aria-labelledby="video-title">
        <div className="video-copy" data-reveal="left">
          <h2 id="video-title">O ponto certo.<br /><em>Bem diante dos olhos.</em></h2>
        </div>
        <div className="video-frame" data-reveal="right">
          <video autoPlay muted loop playsInline preload="metadata" poster="/video/corte-na-brasa-poster.jpg" aria-label="Cupim sendo cortado na chapa">
            <source src="/video/corte-na-brasa.webm" type="video/webm" />
            <source src="/video/corte-na-brasa.mp4" type="video/mp4" />
          </video>
          <div className="video-stamp" aria-hidden="true"><span>Cupim na brasa</span><strong>DO JEITO DO REI</strong></div>
        </div>
      </section>

      <section className="levels-section section-pad" aria-labelledby="levels-title">
        <div className="section-heading light-heading" data-reveal="right">
          <h2 id="levels-title">Sua fidelidade<br /><em>vale mais.</em></h2>
        </div>

        <LevelSimulator />
      </section>

      <section className="food-section section-pad" aria-labelledby="food-title">
        <div className="food-heading" data-reveal="left">
          <p className="kicker">Direto da nossa cozinha</p>
          <h2 id="food-title">Tem recompensa.<br /><em>Tem comida de verdade.</em></h2>
        </div>
        <DishCarousel dishes={dishes} />
      </section>

      <section className="roulette-section section-pad" aria-labelledby="roulette-title">
        <div className="section-heading light-heading" data-reveal="up">
          <h2 id="roulette-title">Roleta do Rei.<br /><em>Gire e sinta o gostinho.</em></h2>
        </div>
        <HomeRoulette />
      </section>

      <section className="channels-section section-pad" aria-labelledby="channels-title">
        <div className="channels-heading" data-reveal="left">
          <div>
            <p className="kicker">Onde encontrar o Rei</p>
            <h2 id="channels-title">Escolha seu caminho.<br /><em>A gente cuida da fome.</em></h2>
          </div>
          <p>
            Cupons e preços mudam em cada plataforma. Confira a oferta no aplicativo e compare com o pedido direto antes de fechar.
          </p>
        </div>

        <div className="channel-grid">
          <a data-reveal="up" className="channel-card instagram" href="https://www.instagram.com/oreidocupim_/" target="_blank" rel="noopener noreferrer">
            <span className="channel-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" className="fill"/></svg>
            </span>
            <div><small>Novidades e promoções</small><strong>Instagram</strong><span>@oreidocupim_</span></div>
            <i aria-hidden="true">↗</i>
          </a>

          <a data-reveal="up" style={{ '--reveal-delay': '90ms' } as React.CSSProperties} className="channel-card maps" href="https://maps.app.goo.gl/YArFsTEErt8N1PiL6" target="_blank" rel="noopener noreferrer">
            <span className="channel-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 22s7-6.1 7-13A7 7 0 0 0 5 9c0 6.9 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>
            </span>
            <div><small>Venha até a churrascaria</small><strong>Google Maps</strong><span>Abrir rota</span></div>
            <i aria-hidden="true">↗</i>
          </a>

          <a data-reveal="up" style={{ '--reveal-delay': '180ms' } as React.CSSProperties} className="channel-card ifood" href="https://www.ifood.com.br/delivery/fortaleza-ce/churrascaria-o-rei-do-cupim-henrique-jorge/d4fc2476-227b-4fe1-87be-85a88bf5fee4?utm_medium=share" target="_blank" rel="noopener noreferrer">
            <span className="channel-mark wordmark" aria-hidden="true">iFood</span>
            <div><small>Delivery</small><strong>Peça no iFood</strong><span>Conferir cupons no app</span></div>
            <i aria-hidden="true">↗</i>
          </a>

          <a data-reveal="up" style={{ '--reveal-delay': '270ms' } as React.CSSProperties} className="channel-card food99" href="https://oia.99app.com/dlp9/RQpH0q" target="_blank" rel="noopener noreferrer">
            <span className="channel-mark wordmark" aria-hidden="true">99</span>
            <div><small>Delivery</small><strong>Peça no 99Food</strong><span>Conferir cupons no app</span></div>
            <i aria-hidden="true">↗</i>
          </a>
        </div>

        <div className="coupon-note" data-reveal="up">
          <span>Códigos de desconto</span>
          <p>Quando tivermos um código oficial ativo, ele aparecerá aqui e no Instagram — sem cupom vencido e sem pegadinha.</p>
        </div>
      </section>

      <section className="final-cta">
        <Image src="/images/home/espetinhos.webp" alt="Espetinhos gourmet assados" fill sizes="100vw" />
        <div className="final-shade" />
        <div className="final-content" data-reveal="up">
          <Image className="final-logo" src="/brand/logo-vertical.png" alt="O Rei do Cupim" width={148} height={154} />
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
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/admin">Área administrativa</Link>
        </nav>
      </footer>
    </main>
  );
}
