'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type Periodo = '7d' | '30d' | '90d';
type SerieDia = { dia: string; total: number };
type SerieValorDia = { dia: string; valor: number };
type SerieProduto = { name: string; value: number };

type AnalyticsPayload = {
  clientesPeriodo?: Array<{ atualizado_em?: string }>;
  pontosEntrada?: Array<{ criado_em?: string; valor?: number }>;
  pontosSaida?: Array<{ criado_em?: string; valor?: number }>;
  resgatesPeriodo?: Array<{ criado_em?: string; tipo?: string; premio_nome?: string | null; valor?: number }>;
  giros?: Array<{ data_hora?: string }>;
};

const CHART_COLORS = ['#c5a059', '#e31e24', '#ffdd57', '#7dd3fc', '#86efac', '#a78bfa'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('7d');

  const [kpis, setKpis] = useState({
    clientesNovos: 0,
    pontosDistribuidos: 0,
    pontosResgatados: 0,
    cashbackDistribuido: 0,
    girosRoleta: 0,
    resgates: 0,
  });

  const [grafClientes, setGrafClientes] = useState<SerieDia[]>([]);
  const [grafPontos, setGrafPontos] = useState<SerieValorDia[]>([]);
  const [grafResgates, setGrafResgates] = useState<SerieDia[]>([]);
  const [grafRoleta, setGrafRoleta] = useState<SerieDia[]>([]);
  const [grafProdutos, setGrafProdutos] = useState<SerieProduto[]>([]);

  useEffect(() => {
    async function carregarAnalytics() {
      setLoading(true);
      setErro(null);

      try {
        const res = await fetchAdmin('/api/admin/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ periodo }),
          cache: 'no-store',
        });

        const json = await res.json();
        const payload: AnalyticsPayload = (json?.data ?? json) || {};

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || 'Falha ao carregar analytics.');
        }

        const clientesPeriodo = payload.clientesPeriodo || [];
        const pontosEntrada = payload.pontosEntrada || [];
        const pontosSaida = payload.pontosSaida || [];
        const resgatesPeriodo = payload.resgatesPeriodo || [];
        const giros = payload.giros || [];

        setKpis({
          clientesNovos: clientesPeriodo.length,
          pontosDistribuidos: somarValores(pontosEntrada, 'valor'),
          pontosResgatados: somarValores(pontosSaida, 'valor'),
          cashbackDistribuido: Number(
            resgatesPeriodo
              .filter((item) => item?.tipo === 'cashback')
              .reduce((acc, item) => acc + Number(item?.valor || 0), 0)
              .toFixed(2)
          ),
          girosRoleta: giros.length,
          resgates: resgatesPeriodo.length,
        });

        setGrafClientes(mapearContagemPorDia(clientesPeriodo, 'atualizado_em'));
        setGrafPontos(mapearSomaPorDia(pontosEntrada, 'criado_em', 'valor'));
        setGrafResgates(mapearContagemPorDia(resgatesPeriodo, 'criado_em'));
        setGrafRoleta(mapearContagemPorDia(giros, 'data_hora'));
        setGrafProdutos(mapearProdutos(resgatesPeriodo));
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Erro ao carregar analytics.');
      } finally {
        setLoading(false);
      }
    }

    carregarAnalytics();
  }, [periodo]);

  if (loading) {
    return <div className="text-[#c5a059] text-xl">Carregando analytics...</div>;
  }

  if (erro) {
    return <div className="text-red-400">{erro}</div>;
  }

  return (
    <div className="space-y-16">
      <div className="flex gap-3">
        {(['7d', '30d', '90d'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`
              px-4 py-2 rounded-lg text-sm font-bold border
              ${
                periodo === p
                  ? 'bg-[#c5a059] text-black border-[#c5a059]'
                  : 'bg-gray-800 text-gray-300 border-gray-700'
              }
            `}
          >
            {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI titulo="Clientes Novos" valor={kpis.clientesNovos} cor="white" />
        <KPI titulo="Pontos Distribuidos" valor={kpis.pontosDistribuidos} cor="#c5a059" />
        <KPI titulo="Pontos Resgatados" valor={kpis.pontosResgatados} cor="#e31e24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI titulo="Resgates" valor={kpis.resgates} cor="#86efac" />
        <KPI titulo="Cashback Distribuido" valor={kpis.cashbackDistribuido} cor="#7dd3fc" />
        <KPI titulo="Giros da Roleta" valor={kpis.girosRoleta} cor="#a78bfa" />
      </div>

      <Section titulo="Clientes Novos por Dia">
        <GraficoLinha dados={grafClientes} dataKey="total" />
      </Section>

      <Section titulo="Pontos Distribuidos por Dia">
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
                <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}

function somarValores<T extends Record<string, unknown>>(rows: T[], valueField: string) {
  return rows.reduce((sum, row) => sum + Number(row?.[valueField] || 0), 0);
}

function mapearContagemPorDia<T extends Record<string, unknown>>(rows: T[], dateField: string): SerieDia[] {
  const mapa: Record<string, number> = {};

  rows.forEach((row) => {
    const raw = row?.[dateField];
    if (!raw || typeof raw !== 'string') return;

    const dia = raw.substring(0, 10);
    mapa[dia] = (mapa[dia] || 0) + 1;
  });

  return Object.entries(mapa)
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

function mapearSomaPorDia<T extends Record<string, unknown>>(
  rows: T[],
  dateField: string,
  valueField: string
): SerieValorDia[] {
  const mapa: Record<string, number> = {};

  rows.forEach((row) => {
    const raw = row?.[dateField];
    if (!raw || typeof raw !== 'string') return;

    const dia = raw.substring(0, 10);
    const valor = Number(row?.[valueField] || 0);
    mapa[dia] = (mapa[dia] || 0) + valor;
  });

  return Object.entries(mapa)
    .map(([dia, valor]) => ({ dia, valor }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

function mapearProdutos(
  rows: Array<{ tipo?: string; premio_nome?: string | null }>
): SerieProduto[] {
  const mapa: Record<string, number> = {};

  rows.forEach((row) => {
    if (row?.tipo !== 'produto') return;
    const nome = (row?.premio_nome || 'Produto').trim();
    mapa[nome] = (mapa[nome] || 0) + 1;
  });

  return Object.entries(mapa).map(([name, value]) => ({ name, value }));
}

type KPIProps = { titulo: string; valor: number; cor: string };
function KPI({ titulo, valor, cor }: KPIProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <p className="text-gray-400 text-xs uppercase font-bold mb-1">{titulo}</p>
      <p className="text-4xl font-black" style={{ color: cor }}>
        {Number(valor || 0).toLocaleString()}
      </p>
    </div>
  );
}

type SectionProps = { titulo: string; children: React.ReactNode };
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

type ChartProps = { dados: Array<{ dia: string; [key: string]: string | number }>; dataKey: string };
function GraficoLinha({ dados, dataKey }: ChartProps) {
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

function GraficoBar({ dados, dataKey }: ChartProps) {
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
