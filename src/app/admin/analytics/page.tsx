'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useMemo, useState } from 'react';

type Preset = '7d' | '30d' | '90d' | 'custom';
type AnalyticsPayload = {
  periodo?: { inicio: string; fim: string };
  clientesPeriodo?: Array<{ atualizado_em?: string }>;
  pontosEntrada?: Array<{ criado_em?: string; valor?: number }>;
  pontosSaida?: Array<{ criado_em?: string; valor?: number }>;
  resgatesPeriodo?: Array<{ criado_em?: string; tipo?: string; premio_nome?: string | null; valor?: number }>;
  giros?: Array<{ data_hora?: string }>;
  base?: { total: number; contasComPin: number; registrosTeste: number };
  whatsapp?: { otpAtivo: boolean; convidadosBeta: number; verificacoesConcluidas: number };
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('30d');
  const [inicio, setInicio] = useState(daysAgo(30));
  const [fim, setFim] = useState(today());
  const [appliedRange, setAppliedRange] = useState({ inicio: daysAgo(30), fim: today() });
  const [data, setData] = useState<AnalyticsPayload>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErro(null);
      try {
        const periodo = preset === 'custom' ? appliedRange : preset;
        const response = await fetchAdmin('/api/admin/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ periodo }),
          cache: 'no-store',
        });
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar o relatório.');
        if (active) setData((json.data ?? json) || {});
      } catch (cause) {
        if (active) setErro(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [preset, appliedRange]);

  const summary = useMemo(() => {
    const entradas = sum(data.pontosEntrada);
    const saidas = sum(data.pontosSaida);
    const resgates = data.resgatesPeriodo || [];
    const cashback = resgates
      .filter((item) => item.tipo === 'cashback')
      .reduce((total, item) => total + Number(item.valor || 0), 0);
    const products = new Map<string, number>();
    resgates.filter((item) => item.tipo === 'produto').forEach((item) => {
      const name = item.premio_nome?.trim() || 'Produto sem nome';
      products.set(name, (products.get(name) || 0) + 1);
    });

    return {
      clientes: data.clientesPeriodo?.length || 0,
      entradas,
      saidas,
      saldo: entradas - saidas,
      resgates: resgates.length,
      cashback,
      giros: data.giros?.length || 0,
      products: [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [data]);

  const periodLabel = data.periodo
    ? `${formatDate(data.periodo.inicio)} a ${formatDate(data.periodo.fim)}`
    : 'Período selecionado';

  function applyCustomRange() {
    if (!inicio || !fim || inicio > fim) {
      setErro('Escolha uma data inicial anterior à data final.');
      return;
    }
    setAppliedRange({ inicio, fim });
  }

  return (
    <div className="admin-report">
      <section className="admin-report-filter" aria-label="Período do relatório">
        <label>
          <span>Período</span>
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Escolher datas</option>
          </select>
        </label>

        {preset === 'custom' && (
          <div className="admin-date-range">
            <label><span>De</span><input type="date" value={inicio} max={fim} onChange={(event) => setInicio(event.target.value)} /></label>
            <label><span>Até</span><input type="date" value={fim} min={inicio} max={today()} onChange={(event) => setFim(event.target.value)} /></label>
            <button type="button" onClick={applyCustomRange}>Atualizar</button>
          </div>
        )}

        <p>{loading ? 'Atualizando…' : periodLabel}</p>
      </section>

      {erro && <div className="admin-notice error"><strong>Não foi possível atualizar o relatório.</strong><span>{erro}</span></div>}

      <section aria-labelledby="report-summary-title">
        <div className="admin-section-title">
          <div><span>Resumo</span><h2 id="report-summary-title">O que aconteceu no período</h2></div>
        </div>
        <div className="admin-kpi-grid admin-report-kpis" aria-busy={loading}>
          <Metric label="Clientes movimentados" value={summary.clientes} note="Cadastros ou dados atualizados" />
          <Metric label="Pontos creditados" value={summary.entradas} note="Compras e ajustes registrados" />
          <Metric label="Resgates realizados" value={summary.resgates} note={`${summary.saidas.toLocaleString('pt-BR')} pontos utilizados`} />
          <Metric label="Giros da roleta" value={summary.giros} note="Participações registradas" />
        </div>
      </section>

      <div className="admin-report-grid">
        <section className="admin-report-card">
          <div className="admin-section-title"><div><span>Benefícios</span><h2>Movimento do programa</h2></div></div>
          <dl className="admin-definition-list">
            <Row label="Pontos que entraram" value={summary.entradas.toLocaleString('pt-BR')} />
            <Row label="Pontos utilizados" value={summary.saidas.toLocaleString('pt-BR')} />
            <Row label="Saldo do período" value={`${summary.saldo >= 0 ? '+' : ''}${summary.saldo.toLocaleString('pt-BR')}`} strong />
            <Row label="Cashback utilizado" value={money(summary.cashback)} />
          </dl>
        </section>

        <section className="admin-report-card">
          <div className="admin-section-title"><div><span>Preferências</span><h2>Produtos mais resgatados</h2></div></div>
          {summary.products.length ? (
            <ol className="admin-ranking">
              {summary.products.map(([name, total], index) => <li key={name}><b>{index + 1}</b><span>{name}</span><strong>{total}</strong></li>)}
            </ol>
          ) : <div className="admin-compact-empty">Nenhum produto resgatado neste período.</div>}
        </section>
      </div>

      <section className="admin-pilot-card">
        <div>
          <span>Piloto controlado</span>
          <h2>Teste com 10 clientes reais</h2>
          <p>A base da Saipos permanece preservada. Somente os telefones convidados poderão usar o OTP durante o piloto.</p>
        </div>
        <div className="admin-pilot-stats">
          <article><span>Base Saipos</span><strong>{number(data.base?.total)}</strong><small>Não são contas de teste</small></article>
          <article><span>Contas com PIN</span><strong>{number(data.base?.contasComPin)}</strong><small>Já concluíram cadastro</small></article>
          <article className="warning"><span>Dados fictícios</span><strong>{number(data.base?.registrosTeste)}</strong><small>Identificados, ainda preservados</small></article>
          <article className={data.whatsapp?.otpAtivo ? 'success' : ''}>
            <span>WhatsApp OTP</span>
            <strong>{data.whatsapp?.otpAtivo ? 'Ativo' : 'Aguardando'}</strong>
            <small>{number(data.whatsapp?.convidadosBeta)} de 10 convidados configurados</small>
          </article>
        </div>
        <footer>
          <span><i className={data.whatsapp?.otpAtivo ? 'ready' : 'waiting'} />Confirmação de número: {data.whatsapp?.otpAtivo ? 'liberada para o piloto' : 'será ativada após configurar o novo número'}</span>
          <span><i className="waiting" />Bot de mensagens: em preparação, ainda não envia nada</span>
        </footer>
      </section>
    </div>
  );
}

function sum(rows: AnalyticsPayload['pontosEntrada'] | AnalyticsPayload['pontosSaida']) {
  return (rows || []).reduce((total, item) => total + Number(item.valor || 0), 0);
}

function number(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('pt-BR') : '—';
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <article><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong><small>{note}</small></article>;
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><dt>{label}</dt><dd className={strong ? 'admin-emphasis' : undefined}>{value}</dd></div>;
}
