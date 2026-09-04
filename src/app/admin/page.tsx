'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type DashboardStats = {
  totalClientes: number;
  saldoPontosAtivos: number;
  totalResgates: number;
  clientesAniversario: number;
};

const sections = [
  { href: '/admin/clientes', icon: '◎', title: 'Encontrar um cliente', description: 'Consulte telefone, nível, pontos, cashback, tickets e última compra.', action: 'Abrir clientes' },
  { href: '/admin/cardapio', icon: '★', title: 'Alterar recompensas', description: 'Cadastre produtos, ajuste o custo em pontos e escolha os destaques.', action: 'Gerenciar recompensas' },
  { href: '/admin/analytics', icon: '▥', title: 'Acompanhar resultados', description: 'Veja cadastros, pontos, resgates e roleta nos últimos 7, 30 ou 90 dias.', action: 'Ver relatórios' },
  { href: '/admin/garcons', icon: '♟', title: 'Gerenciar equipe', description: 'Cadastre garçons, confira o ranking e investigue atividades suspeitas.', action: 'Abrir equipe' },
];

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetchAdmin('/api/admin/dashboard', { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar o resumo.');
        setStats(json.data);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o resumo.');
      }
    }
    load();
  }, []);

  return (
    <div className="admin-home">
      {error && <div className="admin-notice error"><strong>O resumo não carregou.</strong><span>{error}</span></div>}

      <section aria-labelledby="admin-summary-title">
        <div className="admin-section-title"><div><span>Resumo</span><h2 id="admin-summary-title">Situação do clube</h2></div><small>Dados atualizados ao abrir a página</small></div>
        <div className="admin-kpi-grid">
          <article><span>Clientes na base</span><strong>{stats ? stats.totalClientes.toLocaleString('pt-BR') : '—'}</strong><small>Cadastros importados e digitais</small></article>
          <article><span>Pontos em circulação</span><strong>{stats ? stats.saldoPontosAtivos.toLocaleString('pt-BR') : '—'}</strong><small>Estimativa: distribuídos menos resgatados</small></article>
          <article><span>Resgates registrados</span><strong>{stats ? stats.totalResgates.toLocaleString('pt-BR') : '—'}</strong><small>Produtos, cashback e entregas</small></article>
          <article className="accent"><span>Autorizaram aniversário</span><strong>{stats ? stats.clientesAniversario.toLocaleString('pt-BR') : '—'}</strong><small>Campanha ainda não envia mensagens</small></article>
        </div>
      </section>

      <section aria-labelledby="admin-actions-title">
        <div className="admin-section-title"><div><span>Atalhos</span><h2 id="admin-actions-title">O que você quer fazer?</h2></div></div>
        <div className="admin-action-grid">
          {sections.map((section) => <Link key={section.href} href={section.href}><i aria-hidden="true">{section.icon}</i><div><h3>{section.title}</h3><p>{section.description}</p><span>{section.action} →</span></div></Link>)}
        </div>
      </section>

      <section className="admin-status-grid" aria-label="Situação das integrações">
        <article><div><span className="status-dot ready" />Integração automática</div><h3>Saipos</h3><p>As vendas devem entrar automaticamente. A importação manual de vendas continua bloqueada para evitar duplicidade.</p><Link href="/admin/importar">Abrir importação de clientes →</Link></article>
        <article><div><span className="status-dot waiting" />Aguardando configuração</div><h3>WhatsApp de aniversário</h3><p>A data e a autorização já são registradas. O envio automático será ativado somente depois da integração do novo número.</p></article>
        <article><div><span className="status-dot attention" />Ações sensíveis</div><h3>Sorteios e segurança</h3><p>Rodar sorteio, zerar ranking e desbloquear usuário alteram dados. Essas ações continuam exigindo confirmação.</p><Link href="/admin/sorteio">Abrir sorteios →</Link></article>
      </section>
    </div>
  );
}
