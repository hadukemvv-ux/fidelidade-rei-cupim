'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==================== TIPOS ====================

type GrafDia = { dia: string; total: number };
type GrafValorDia = { dia: string; valor: number };
type GrafProduto = { name: string; value: number };

type KPIProps = { titulo: string; valor: number; cor: string };
type SectionProps = { titulo: string; children: React.ReactNode };
type GraficoLinhaProps = { dados: GrafDia[] | GrafValorDia[]; dataKey: string };
type GraficoBarProps = { dados: GrafDia[] | GrafValorDia[]; dataKey: string };

export default function AnalyticsPage() {

  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('7d');

  const [kpis, setKpis] = useState({
    clientesNovos: 0,
    pontosDistribuídos: 0,
    pontosResgatados: 0,
    cashbackDistribuido: 0,
    girosRoleta: 0,
    resgates: 0
  });

  // GRÁFICOS TIPADOS
  const [grafClientes, setGrafClientes] = useState<GrafDia[]>([]);
  const [grafPontos, setGrafPontos] = useState<GrafValorDia[]>([]);
  const [grafResgates, setGrafResgates] = useState<GrafDia[]>([]);
  const [grafRoleta, setGrafRoleta] = useState<GrafDia[]>([]);
  const [grafProdutos, setGrafProdutos] = useState<GrafProduto[]>([]);


  // ==================== CARREGAR ====================

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      await Promise.all([
        carregarKPIs(),
        carregarGraficoClientes(),
        carregarGraficoPontos(),
        carregarGraficoResgates(),
        carregarGraficoGiros(),
        carregarRankingProdutos()
      ]);

      setLoading(false);
    }

    carregar();
  }, [periodo]);

  // ==================== DATA INÍCIO ====================

  function getDataInicio() {
    const hoje = new Date();
    if (periodo === '7d') hoje.setDate(hoje.getDate() - 7);
    if (periodo === '30d') hoje.setDate(hoje.getDate() - 30);
    if (periodo === '90d') hoje.setDate(hoje.getDate() - 90);
    return hoje.toISOString().substring(0, 10);
  }

  // ==================== KPIs ====================

  async function carregarKPIs() {
    const inicio = getDataInicio();

    const { count: clientes } = await supabase
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true })
      .gte('atualizado_em', inicio);

    const { data: entradas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'entrada')
      .gte('criado_em', inicio);

    const pontosDist = entradas?.reduce((s, e) => s + e.valor, 0) ?? 0;

    const { data: saidas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'saida')
      .gte('criado_em', inicio);

    const pontosSai = saidas?.reduce((s, e) => s + e.valor, 0) ?? 0;

    const { data: cashbackData } = await supabase
      .from('resgates')
      .select('valor')
      .eq('tipo', 'cashback')
      .gte('criado_em', inicio);

    const cashback = cashbackData?.reduce((s, e) => s + e.valor, 0) ?? 0;

    const { count: totalResgates } = await supabase
      .from('resgates')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', inicio);

    const { count: giros } = await supabase
      .from('historico_roleta')
      .select('*', { count: 'exact', head: true })
      .gte('data_hora', inicio);

    setKpis({
      clientesNovos: clientes ?? 0,
      pontosDistribuídos: pontosDist,
      pontosResgatados: pontosSai,
      cashbackDistribuido: cashback,
      girosRoleta: giros ?? 0,
      resgates: totalResgates ?? 0
    });
  }

  // ==================== GRÁFICOS ====================

  async function carregarGraficoClientes() {
    const inicio = getDataInicio();
    const { data } = await supabase
      .from('base_clientes_saipos')
      .select('atualizado_em')
      .gte('atualizado_em', inicio);

    const mapa: Record<string, number> = {};

    data?.forEach((c) => {
      const dia = c.atualizado_em.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    setGrafClientes(Object.entries(mapa).map(([dia, total]) => ({ dia, total })));
  }

  async function carregarGraficoPontos() {
    const inicio = getDataInicio();
    const { data } = await supabase
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'entrada')
      .gte('criado_em', inicio);

    const mapa: Record<string, number> = {};

    data?.forEach((r) => {
      const dia = r.criado_em.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + r.valor;
    });

    setGrafPontos(Object.entries(mapa).map(([dia, valor]) => ({ dia, valor })));
  }

  async function carregarGraficoResgates() {
    const inicio = getDataInicio();
    const { data } = await supabase
      .from('resgates')
      .select('criado_em')
      .gte('criado_em', inicio);

    const mapa: Record<string, number> = {};

    data?.forEach((r) => {
      const dia = r.criado_em.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    setGrafResgates(Object.entries(mapa).map(([dia, total]) => ({ dia, total })));
  }

  async function carregarGraficoGiros() {
    const inicio = getDataInicio();
    const { data } = await supabase
      .from('historico_roleta')
      .select('data_hora')
      .gte('data_hora', inicio);

    const mapa: Record<string, number> = {};

    data?.forEach((r) => {
      const dia = r.data_hora.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    setGrafRoleta(Object.entries(mapa).map(([dia, total]) => ({ dia, total })));
  }

  async function carregarRankingProdutos() {
    const inicio = getDataInicio();
    const { data } = await supabase
      .from('resgates')
      .select('premio_nome')
      .eq('tipo', 'produto')
      .gte('criado_em', inicio);

    const mapa: Record<string, number> = {};

    data?.forEach((p) => {
      mapa[p.premio_nome] = (mapa[p.premio_nome] || 0) + 1;
    });

    setGrafProdutos(
      Object.entries(mapa).map(([name, value]) => ({ name, value }))
    );
  }

  // ==================== RENDER ====================

  if (loading) {
    return <div className="text-[#c5a059] text-xl">Carregando analytics…</div>;
  }

  const colors = ["#c5a059", "#e31e24", "#ffdd57", "#7dd3fc", "#86efac", "#a78bfa"];

  return (
    <div className="space-y-16">

      {/* FILTROS */}
      <div className="flex gap-3">
        {['7d', '30d', '90d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p as '7d' | '30d' | '90d')}
            className={`
              px-4 py-2 rounded-lg text-sm font-bold border
              ${periodo === p
                ? 'bg-[#c5a059] text-black border-[#c5a059]'
                : 'bg-gray-800 text-gray-300 border-gray-700'}
            `}
          >
            {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI titulo="Clientes Novos" valor={kpis.clientesNovos} cor="white" />
        <KPI titulo="Pontos Distribuídos" valor={kpis.pontosDistribuídos} cor="#c5a059" />
        <KPI titulo="Pontos Resgatados" valor={kpis.pontosResgatados} cor="#e31e24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI titulo="Resgates" valor={kpis.resgates} cor="#86efac" />
        <KPI titulo="Cashback Distribuído" valor={kpis.cashbackDistribuido} cor="#7dd3fc" />
        <KPI titulo="Giros da Roleta" valor={kpis.girosRoleta} cor="#a78bfa" />
      </div>

      {/* GRÁFICOS */}
      <Section titulo="Clientes Novos por Dia">
        <GraficoLinha dados={grafClientes} dataKey="total" />
      </Section>

      <Section titulo="Pontos Distribuídos por Dia">
        <GraficoLinha dados={grafPontos} dataKey="valor" />
      </Section>

      <Section titulo="Resgates por Dia">
        <GraficoLinha dados={grafResgates} dataKey="total" />
      </Section>

      <Section titulo="Giros da Roleta por Dia">
        <GraficoBar dados={grafRoleta} dataKey="total" />
      </Section>

      <Section titulo="Ranking de Produtos">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={grafProdutos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {grafProdutos.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}

// ==================== COMPONENTES ====================

function KPI({ titulo, valor, cor }: KPIProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <p className="text-gray-400 text-xs uppercase font-bold mb-1">{titulo}</p>
      <p className="text-4xl font-black" style={{ color: cor }}>
        {valor.toLocaleString()}
      </p>
    </div>
  );
}

function Section({ titulo, children }: SectionProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-[#c5a059]">{titulo}</h2>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700" style={{ height: 350 }}>
        {children}
      </div>
    </div>
  );
}

function GraficoLinha({ dados, dataKey }: GraficoLinhaProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke="#c5a059" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GraficoBar({ dados, dataKey }: GraficoBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey} fill="#c5a059" />
      </BarChart>
    </ResponsiveContainer>
  );
}