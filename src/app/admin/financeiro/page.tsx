'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAdmin } from '@/lib/adminFetch';

type Overview = { faturamento_total: number; ticket_medio: number; total_pedidos: number; clientes_unicos: number; novos_clientes_30dias: number; clientes_recorrentes: number };
type Day = { data: string; faturamento: number; pedidos: number };
type Month = { mes: string; faturamento: number; pedidos: number };
type RankedClient = { id: number; posicao: number; nome: string; total_gasto: number };
type Loyalty = { total_pontos: number; total_cashback: number; custo_programa: number; custo_relativo: number };

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function getAdminJson(path: string) {
  const response = await fetchAdmin(path, { cache: 'no-store' });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error || json?.erro || `Falha ao consultar ${path}.`);
  return json?.data ?? json;
}

async function fetchFinanceData() {
  const [overviewData, dayData, monthData, clientData, loyaltyData, categoryData] = await Promise.all([
    getAdminJson('/api/financeiro/overview'), getAdminJson('/api/financeiro/por-dia'), getAdminJson('/api/financeiro/por-mes'),
    getAdminJson('/api/financeiro/clientes'), getAdminJson('/api/financeiro/fidelidade'), getAdminJson('/api/financeiro/categorias'),
  ]);
  return { overviewData, dayData, monthData, clientData, loyaltyData, categoryData };
}

export default function FinanceiroPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [months, setMonths] = useState<Month[]>([]);
  const [topClients, setTopClients] = useState<RankedClient[]>([]);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const { overviewData, dayData, monthData, clientData, loyaltyData, categoryData } = await fetchFinanceData();
      setOverview(overviewData); setDays(dayData.dias || []); setMonths(monthData.meses || []); setTopClients(clientData.top10 || []); setLoyalty(loyaltyData); setCategories(categoryData.categorias || {});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados financeiros.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        const data = await fetchFinanceData();
        if (!active) return;
        setOverview(data.overviewData); setDays(data.dayData.dias || []); setMonths(data.monthData.meses || []); setTopClients(data.clientData.top10 || []); setLoyalty(data.loyaltyData); setCategories(data.categoryData.categorias || {});
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados financeiros.');
      } finally {
        if (active) setLoading(false);
      }
    }
    initialLoad();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="admin-loading">Carregando dados financeiros…</div>;
  if (error) return <div className="admin-notice error"><strong>O financeiro não carregou.</strong><span>{error}</span><button onClick={load}>Tentar novamente</button></div>;

  return (
    <div className="admin-finance">
      <div className="admin-notice"><strong>Como interpretar estes números</strong><span>Os totais vêm da base consolidada da Saipos. Os gráficos por período são estimativas que atribuem o acumulado de cada cliente à data da última compra; não representam o fechamento contábil.</span></div>
      <div className="admin-kpi-grid"><article><span>Faturamento acumulado</span><strong>{money(overview?.faturamento_total || 0)}</strong><small>Base consolidada</small></article><article><span>Ticket médio</span><strong>{money(overview?.ticket_medio || 0)}</strong><small>Faturamento ÷ pedidos</small></article><article><span>Pedidos registrados</span><strong>{Number(overview?.total_pedidos || 0).toLocaleString('pt-BR')}</strong><small>Importados da Saipos</small></article><article><span>Clientes recorrentes</span><strong>{Number(overview?.clientes_recorrentes || 0).toLocaleString('pt-BR')}</strong><small>Mais de um pedido</small></article></div>
      <div className="admin-chart-grid"><section><div><span>Estimativa</span><h2>Últimos 30 dias</h2></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={days}><CartesianGrid stroke="#3b302d" strokeDasharray="3 3" /><XAxis dataKey="data" tick={{ fill: '#9f918b', fontSize: 11 }} /><YAxis tick={{ fill: '#9f918b', fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="faturamento" stroke="#f02b1f" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></section><section><div><span>Estimativa</span><h2>Últimos 12 meses</h2></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={months}><CartesianGrid stroke="#3b302d" strokeDasharray="3 3" /><XAxis dataKey="mes" tick={{ fill: '#9f918b', fontSize: 11 }} /><YAxis tick={{ fill: '#9f918b', fontSize: 11 }} /><Tooltip /><Bar dataKey="faturamento" fill="#e1a747" /></BarChart></ResponsiveContainer></div></section></div>
      <div className="admin-detail-grid"><section><div className="admin-section-title"><div><span>Fidelidade</span><h2>Custo em circulação</h2></div></div><dl className="admin-definition-list"><div><dt>Pontos acumulados</dt><dd>{Number(loyalty?.total_pontos || 0).toLocaleString('pt-BR')}</dd></div><div><dt>Cashback acumulado</dt><dd>{money(loyalty?.total_cashback || 0)}</dd></div><div><dt>Custo estimado total</dt><dd>{money(loyalty?.custo_programa || 0)}</dd></div><div><dt>Sobre o faturamento</dt><dd>{Number(loyalty?.custo_relativo || 0).toFixed(2)}%</dd></div></dl></section><section><div className="admin-section-title"><div><span>Clientes</span><h2>Maiores compradores</h2></div></div><ol className="admin-ranking">{topClients.map((client) => <li key={client.id}><b>{client.posicao}</b><span>{client.nome}</span><strong>{money(client.total_gasto)}</strong></li>)}</ol></section><section><div className="admin-section-title"><div><span>Recompensas</span><h2>Resgates por categoria</h2></div></div><dl className="admin-definition-list">{Object.entries(categories).map(([category, count]) => <div key={category}><dt>{category || 'Sem categoria'}</dt><dd>{count}</dd></div>)}{Object.keys(categories).length === 0 && <div><dt>Ainda não há resgates categorizados.</dt></div>}</dl></section></div>
    </div>
  );
}
