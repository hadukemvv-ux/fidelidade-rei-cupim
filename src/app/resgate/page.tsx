'use client';

import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CUSTO_ENTREGA_GRATIS_PONTOS } from '@/lib/fidelidade-rules';

type Feedback = { type: 'success' | 'error'; text: string } | null;
type ClubSection = 'recompensas' | 'cashback' | 'sorteio';
type CustomerData = {
  cliente: { nome: string; telefone: string };
  pontos: number;
  cashback: number;
  tickets: number;
  nivel: { atual: string; proximo: string | null; progresso: number; faltamReais: number; multiplicadorAtual: number };
};
type Product = { id: number; nome: string; descricao?: string | null; imagem_url?: string | null; custo_em_pontos: number; destaque?: boolean; ativo?: boolean; categoria?: string | null };
type Draw = { titulo: string; imagem_url?: string | null; data_sorteio?: string | null };
type Winner = { id: number | string; nome?: string; nome_cliente?: string; created_at?: string; criado_em?: string };
type PendingReward = { tipo: 'produto' | 'frete' | 'cashback'; nome: string; custo: string; valorDesconto?: number; produtoId?: number };

const sections: Array<{ id: ClubSection; label: string }> = [
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'cashback', label: 'Cashback' },
  { id: 'sorteio', label: 'Sorteio' },
];

const levelNames: Record<string, string> = { BRONZE: 'Brasa', PRATA: 'Chama', OURO: 'Nobre', REI: 'Majestade' };

function onlyDigits(value: string) { return value.replace(/\D/g, ''); }
function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
function formatMoney(value: number) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'Cliente'; }

export default function ResgatePage() {
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [pinLiberado, setPinLiberado] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [dadosCliente, setDadosCliente] = useState<CustomerData | null>(null);
  const [cupom, setCupom] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [premio, setPremio] = useState<Draw | null>(null);
  const [ganhadores, setGanhadores] = useState<Winner[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [activeSection, setActiveSection] = useState<ClubSection>('recompensas');
  const [pendingReward, setPendingReward] = useState<PendingReward | null>(null);

  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
  const visibleProducts = useMemo(() => produtos
    .filter((product) => product.ativo !== false)
    .filter((product) => filtroCategoria === 'todos' ? true : filtroCategoria === 'destaque' ? product.destaque : product.categoria === filtroCategoria), [produtos, filtroCategoria]);

  useEffect(() => {
    Promise.all([
      fetch('/api/sorteio/ganhadores').then((response) => response.json()),
      fetch('/api/produtos').then((response) => response.json()),
      fetch('/api/sorteio/atual').then((response) => response.json()),
    ]).then(([winnersResponse, productsResponse, drawResponse]) => {
      const winners = winnersResponse?.data ?? winnersResponse;
      const products = productsResponse?.data ?? productsResponse;
      const draw = drawResponse?.data ?? drawResponse;
      setGanhadores(winners?.ganhadores || []);
      setProdutos(Array.isArray(products) ? products : products?.produtos || []);
      setPremio(draw?.sorteio || null);
    }).catch(() => setFeedback({ type: 'error', text: 'Não foi possível carregar todas as recompensas agora.' }));

    fetch('/api/resgate')
      .then(async (response) => ({ ok: response.ok, body: await response.json() }))
      .then(({ ok, body }) => { if (ok && body?.ok) setDadosCliente(body.data ?? body); })
      .finally(() => setRestoringSession(false));
  }, []);

  async function verificarCadastro() {
    setFeedback(null);
    if (telefoneDigits.length !== 11) return setFeedback({ type: 'error', text: 'Digite seu WhatsApp com DDD.' });
    setLoading(true);
    try {
      const response = await fetch('/api/resgate/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: telefoneDigits }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível verificar este número.');
      if (data.status === 'novo' || data.status === 'pre_cadastro') {
        window.location.href = `/cadastro?telefone=${telefoneDigits}`;
        return;
      }
      setPinLiberado(true);
      setFeedback({ type: 'success', text: 'Tudo certo. Agora digite seu PIN.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao verificar.' });
    } finally { setLoading(false); }
  }

  async function fazerLogin() {
    setFeedback(null);
    if (pin.length !== 4) return setFeedback({ type: 'error', text: 'O PIN precisa ter 4 dígitos.' });
    setLoading(true);
    try {
      const response = await fetch('/api/resgate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: telefoneDigits, pin }) });
      const data = await response.json();
      const payload = data?.data ?? data;
      if (!response.ok || !data?.ok) throw new Error(data?.error || payload?.error || 'Não foi possível entrar.');
      if (payload?.pre_cadastro) {
        window.location.href = `/cadastro?telefone=${telefoneDigits}`;
        return;
      }
      setDadosCliente(payload);
      setFeedback(null);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao acessar sua conta.' });
    } finally { setLoading(false); }
  }

  async function confirmarResgate() {
    if (!dadosCliente || !pendingReward) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/resgate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: dadosCliente.cliente.telefone, pin, tipo: pendingReward.tipo, valorDesconto: pendingReward.valorDesconto, produtoId: pendingReward.produtoId }),
      });
      const data = await response.json();
      const payload = data?.data ?? data;
      if (!response.ok || !data?.ok) throw new Error(data?.error || payload?.error || 'Não foi possível concluir o resgate.');
      setCupom(payload?.codigo || null);
      setDadosCliente(payload?.atualizado || null);
      setPendingReward(null);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar resgate.' });
      setPendingReward(null);
    } finally { setLoading(false); }
  }

  async function sair() {
    await fetch('/api/resgate/logout', { method: 'POST' });
    setDadosCliente(null); setTelefone(''); setPin(''); setPinLiberado(false); setCupom(null);
  }

  if (restoringSession) return <main className="club-loading" aria-live="polite"><Image src="/logo.png" alt="" width={76} height={76} priority /><span>Acendendo a brasa...</span></main>;

  if (!dadosCliente) {
    return (
      <main className="club-login-page">
        <div className="club-login-photo"><Image src="/images/home/hero-cupim.webp" alt="Cupim assado na brasa" fill priority sizes="(max-width: 799px) 100vw, 50vw" /></div>
        <section className="club-login-content" aria-labelledby="club-login-title">
          <Link href="/" className="club-login-brand" aria-label="Voltar ao início"><Image src="/logo.png" alt="" width={52} height={52} /><span>O Rei do Cupim</span></Link>
          <div className="club-login-copy"><p>Seu espaço no clube</p><h1 id="club-login-title">Tudo que você ganhou.<br /><em>Pronto para aproveitar.</em></h1></div>
          <div className="club-login-card">
            <div className="login-step"><span>{pinLiberado ? '02' : '01'}</span><p>{pinLiberado ? 'Digite seu PIN' : 'Informe seu WhatsApp'}</p></div>
            {feedback && <div className={`club-feedback ${feedback.type}`} role="status">{feedback.text}</div>}
            <label htmlFor="club-phone">WhatsApp com DDD</label>
            <div className="club-field"><span aria-hidden="true">+55</span><input id="club-phone" value={telefone} onChange={(event) => { setTelefone(formatPhoneBR(event.target.value)); setPinLiberado(false); }} inputMode="tel" autoComplete="tel" placeholder="(85) 9 0000-0000" disabled={loading} /></div>
            {!pinLiberado ? (
              <button type="button" className="club-main-button" onClick={verificarCadastro} disabled={loading}>{loading ? 'Verificando...' : 'Continuar'}<span aria-hidden="true">→</span></button>
            ) : (
              <div className="club-pin-step">
                <label htmlFor="club-pin">PIN de 4 dígitos</label>
                <input id="club-pin" value={pin} onChange={(event) => setPin(onlyDigits(event.target.value).slice(0, 4))} onKeyDown={(event) => { if (event.key === 'Enter') fazerLogin(); }} inputMode="numeric" autoComplete="current-password" type="password" maxLength={4} placeholder="••••" autoFocus />
                <button type="button" className="club-main-button" onClick={fazerLogin} disabled={loading}>{loading ? 'Entrando...' : 'Abrir meu clube'}<span aria-hidden="true">→</span></button>
                <Link href="/redefinir-pin" className="club-forgot">Esqueci meu PIN</Link>
              </div>
            )}
            <p className="club-new-user">Primeira vez por aqui? <Link href="/cadastro">Cadastre-se grátis</Link></p>
          </div>
        </section>
      </main>
    );
  }

  const progress = Math.max(0, Math.min(100, Number(dadosCliente.nivel?.progresso ?? 0)));
  const currentLevel = levelNames[dadosCliente.nivel?.atual] || dadosCliente.nivel?.atual || 'Brasa';
  const nextLevel = dadosCliente.nivel?.proximo ? levelNames[dadosCliente.nivel.proximo] : null;
  const progressStyle = { '--club-progress': `${progress}%` } as CSSProperties;

  return (
    <div className="club-page">
      <header className="club-header"><Link href="/" className="club-brand"><Image src="/logo.png" alt="" width={44} height={44} /><span><small>CLUBE</small><strong>O Rei do Cupim</strong></span></Link><button type="button" onClick={sair} className="club-logout">Sair</button></header>
      <main className="club-dashboard">
        {feedback && <div className={`club-feedback ${feedback.type}`} role="status">{feedback.text}</div>}
        <section className="club-overview" aria-labelledby="welcome-title">
          <div className="club-welcome"><p>Que bom ter você de volta,</p><h1 id="welcome-title">{firstName(dadosCliente.cliente.nome)}<em>.</em></h1><span>Seu próximo benefício já está mais perto.</span></div>
          <article className="club-level-card" style={progressStyle}>
            <div className="club-level-top"><span>Seu nível</span><strong>{currentLevel}</strong></div><div className="club-progress-track"><i /></div>
            <div className="club-level-bottom">{nextLevel ? <><span>{Math.round(progress)}% do caminho</span><b>Faltam {formatMoney(dadosCliente.nivel.faltamReais)} para {nextLevel}</b></> : <><span>Nível máximo</span><b>Você chegou ao topo do clube</b></>}</div>
          </article>
        </section>
        <section className="club-balances" aria-label="Seus saldos">
          <article className="balance-card balance-points"><span>Pontos</span><strong>{dadosCliente.pontos.toLocaleString('pt-BR')}</strong><small>{dadosCliente.nivel?.multiplicadorAtual || 1}x por real</small></article>
          <article className="balance-card balance-cash"><span>Cashback</span><strong>{formatMoney(Number(dadosCliente.cashback))}</strong><small>para usar em desconto</small></article>
          <article className="balance-card balance-tickets"><span>Tickets</span><strong>{dadosCliente.tickets.toLocaleString('pt-BR')}</strong><small>sorteio em breve</small></article>
        </section>
        <nav className="club-section-tabs" aria-label="Áreas do clube">{sections.map((section) => <button key={section.id} type="button" className={activeSection === section.id ? 'active' : ''} onClick={() => setActiveSection(section.id)}>{section.label}</button>)}</nav>

        {activeSection === 'recompensas' && (
          <section className="club-store" aria-labelledby="rewards-title">
            <div className="club-section-heading"><div><p>Troque seus pontos</p><h2 id="rewards-title">Escolha seu próximo sabor.</h2></div><span>Arraste para explorar →</span></div>
            <div className="club-filters" aria-label="Filtrar recompensas">{['todos', 'destaque', 'prato', 'bebida', 'sobremesa'].map((category) => <button key={category} type="button" className={filtroCategoria === category ? 'active' : ''} onClick={() => setFiltroCategoria(category)}>{category === 'destaque' ? 'Ofertas' : category}</button>)}</div>
            {visibleProducts.length > 0 ? <div className="rewards-rail">{visibleProducts.map((product) => {
              const original = Number(product.custo_em_pontos || 0); const finalCost = product.destaque ? Math.floor(original * .5) : original; const available = dadosCliente.pontos >= finalCost;
              return <article className="reward-card" key={product.id}><div className="reward-image">{product.imagem_url ? <img src={product.imagem_url} alt={product.nome} /> : <Image src="/images/home/espetinhos.webp" alt="" fill sizes="20rem" />}{product.destaque && <span>50% OFF</span>}</div><div className="reward-body"><small>{product.categoria || 'Recompensa'}</small><h3>{product.nome}</h3><p>{product.descricao || 'Feito na hora, do jeito do Rei.'}</p></div><div className="reward-footer"><strong>{finalCost.toLocaleString('pt-BR')} <small>pts</small></strong><button type="button" disabled={!available || loading} onClick={() => setPendingReward({ tipo: 'produto', produtoId: product.id, nome: product.nome, custo: `${finalCost.toLocaleString('pt-BR')} pontos` })}>{available ? 'Resgatar' : `Faltam ${(finalCost - dadosCliente.pontos).toLocaleString('pt-BR')}`}</button></div></article>;
            })}</div> : <div className="club-empty">Nenhuma recompensa nesta categoria por enquanto.</div>}
            <article className="delivery-reward"><div><span>★ Destaque do clube</span><h3>Taxa de entrega por nossa conta.</h3><p>Use {CUSTO_ENTREGA_GRATIS_PONTOS.toLocaleString('pt-BR')} pontos em pedidos diretos. Consulte disponibilidade e área de entrega.</p></div><button type="button" disabled={dadosCliente.pontos < CUSTO_ENTREGA_GRATIS_PONTOS || loading} onClick={() => setPendingReward({ tipo: 'frete', nome: 'Taxa de entrega grátis', custo: `${CUSTO_ENTREGA_GRATIS_PONTOS.toLocaleString('pt-BR')} pontos` })}>{dadosCliente.pontos >= CUSTO_ENTREGA_GRATIS_PONTOS ? 'Quero entrega grátis' : `Faltam ${(CUSTO_ENTREGA_GRATIS_PONTOS - dadosCliente.pontos).toLocaleString('pt-BR')} pts`}</button></article>
          </section>
        )}

        {activeSection === 'cashback' && <section className="club-cashback" aria-labelledby="cashback-title"><div className="club-section-heading"><div><p>Desconto imediato</p><h2 id="cashback-title">Seu cashback vira economia.</h2></div></div><div className="cashback-options">{[5, 10, 15].map((value) => { const available = Number(dadosCliente.cashback) >= value; return <button type="button" key={value} disabled={!available || loading} onClick={() => setPendingReward({ tipo: 'cashback', valorDesconto: value, nome: `Desconto de ${formatMoney(value)}`, custo: `${formatMoney(value)} do cashback` })}><span>Desconto</span><strong>{formatMoney(value)}</strong><small>{available ? 'Toque para usar' : 'Saldo insuficiente'}</small></button>; })}</div></section>}

        {activeSection === 'sorteio' && <section className="club-draw" aria-labelledby="draw-title"><div className="club-section-heading"><div><p>Suas chances</p><h2 id="draw-title">Cada ticket pode virar história.</h2></div></div><div className="draw-layout"><article className="draw-ticket"><span>Você já acumulou</span><strong>{dadosCliente.tickets}</strong><b>{dadosCliente.tickets === 1 ? 'ticket de sorteio' : 'tickets de sorteio'}</b><small>Continue acumulando. O sorteio será liberado em breve.</small></article>{premio && <article className="draw-prize">{premio.imagem_url && <img src={premio.imagem_url} alt={premio.titulo} />}<div><span>Próximo prêmio</span><h3>{premio.titulo}</h3>{premio.data_sorteio && <p>{new Date(`${premio.data_sorteio}T12:00:00`).toLocaleDateString('pt-BR')}</p>}</div></article>}</div>{ganhadores.length > 0 && <div className="winner-strip"><span>Últimos ganhadores</span>{ganhadores.slice(0, 4).map((winner) => <article key={winner.id}><i>{firstName(winner.nome || winner.nome_cliente || 'Cliente').slice(0, 1)}</i><div><strong>{winner.nome || winner.nome_cliente || 'Cliente do clube'}</strong><small>{new Date(winner.created_at || winner.criado_em || '').toLocaleDateString('pt-BR')}</small></div></article>)}</div>}</section>}
      </main>

      {pendingReward && <div className="club-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingReward(null); }}><section className="club-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="modal-kicker">Confirmar resgate</span><h2 id="confirm-title">{pendingReward.nome}</h2><p>Serão usados <strong>{pendingReward.custo}</strong>. Depois, mostre o cupom no caixa.</p>{!pin && <div className="modal-pin"><label htmlFor="confirm-pin">Confirme seu PIN</label><input id="confirm-pin" value={pin} onChange={(event) => setPin(onlyDigits(event.target.value).slice(0, 4))} inputMode="numeric" type="password" maxLength={4} placeholder="••••" autoFocus /></div>}<button type="button" className="club-main-button" onClick={confirmarResgate} disabled={loading || pin.length !== 4}>{loading ? 'Preparando...' : 'Sim, quero resgatar'}</button><button type="button" className="modal-cancel" onClick={() => setPendingReward(null)}>Agora não</button></section></div>}
      {cupom && <div className="club-modal-backdrop coupon-backdrop"><section className="club-coupon" role="dialog" aria-modal="true" aria-labelledby="coupon-title"><span>Resgate confirmado</span><h2 id="coupon-title">Seu prêmio está pronto!</h2><div className="coupon-code">{cupom}</div><div className="coupon-qr"><QRCodeSVG value={`${window.location.origin}/validar?cupom=${cupom}`} size={150} /></div><p>Mostre este QR Code no caixa.</p><button type="button" onClick={() => setCupom(null)}>Voltar ao clube</button></section></div>}
    </div>
  );
}
