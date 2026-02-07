'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardSimples() {
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    totalClientes: 0,
    pontosDistribuidos: 0,
    pontosResgatados: 0,
    totalResgates: 0,
    cashbackDistribuido: 0
  });

  const [grafClientes, setGrafClientes] = useState<any[]>([]);
  const [grafPontos, setGrafPontos] = useState<any[]>([]);
  const [grafResgates, setGrafResgates] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      await Promise.all([
        carregarKPIs(),
        carregarClientesDia(),
        carregarPontosDia(),
        carregarResgatesDia()
      ]);

      setLoading(false);
    }

    carregar();
  }, []);

  // ---------------- KPI ----------------
  async function carregarKPIs() {
    // Total de clientes
    const { count: totalClientes } = await supabase
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true });

    // Pontos distribuídos
    const { data: entradas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'entrada');

    const pontosDist = entradas?.reduce((s, e) => s + e.valor, 0) || 0;

    // Pontos resgatados
    const { data: saidas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'saida');

    const pontosSai = saidas?.reduce((s, e) => s + e.valor, 0) || 0;

    // Resgates
    const { count: totalResgates } = await supabase
      .from('resgates')
      .select('*', { count: 'exact', head: true });

    // Cashback distribuído
    const { data: cashbackData } = await supabase
      .from('resgates')
      .select('valor')
      .eq('tipo', 'cashback');

    const cashback = cashbackData?.reduce((s, e) => s + e.valor, 0) || 0;

    setKpis({
      totalClientes: totalClientes || 0,
      pontosDistribuidos: pontosDist,
      pontosResgatados: pontosSai,
      totalResgates: totalResgates || 0,
      cashbackDistribuido: cashback
    });
  }

  // ---------- Gráfico: Clientes por dia ----------
  async function carregarClientesDia() {
    const { data } = await supabase
      .from('base_clientes_saipos')
      .select('id, atualizado_em');

    const mapa: Record<string, number> = {};

    data?.forEach((c) => {
      const dia = c.atualizado_em?.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    const arr = Object.entries(mapa).map(([dia, total]) => ({ dia, total }));
    setGrafClientes(arr);
  }

  // ---------- Gráfico: Pontos distribuídos por dia ----------
  async function carregarPontosDia() {
    const { data } = await supabase
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'entrada');

    const mapa: Record<string, number> = {};

    data?.forEach((r) => {
      const dia = r.criado_em.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + r.valor;
    });

    const arr = Object.entries(mapa).map(([dia, valor]) => ({ dia, valor }));
    setGrafPontos(arr);
  }

  // ---------- Gráfico: Resgates por dia ----------
  async function carregarResgatesDia() {
    const { data } = await supabase
      .from('resgates')
      .select('id, criado_em');

    const mapa: Record<string, number> = {};

    data?.forEach((r) => {
      const dia = r.criado_em.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    const arr = Object.entries(mapa).map(([dia, total]) => ({ dia, total }));
    setGrafResgates(arr);
  }

  if (loading) {
    return (
      <div className="text-[#c5a059] text-xl">Carregando dashboard…</div>
    );
  }

  return (
    <div className="space-y-12">

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card titulo="Total de Clientes" valor={kpis.totalClientes} cor="white" />
        <Card titulo="Pontos Distribuídos" valor={kpis.pontosDistribuidos} cor="#c5a059" />
        <Card titulo="Pontos Resgatados" valor={kpis.pontosResgatados} cor="#e31e24" />

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card titulo="Total de Resgates" valor={kpis.totalResgates} cor="lightgreen" />
        <Card titulo="Cashback Distribuído (R$)" valor={kpis.cashbackDistribuido} cor="skyblue" />

      </div>

      {/* GRÁFICOS */}
      <Section titulo="Clientes Novos por Dia">
        <GraficoLinha dados={grafClientes} chave="total" />
      </Section>

      <Section titulo="Pontos Distribuídos por Dia">
        <GraficoBarra dados={grafPontos} chave="valor" />
      </Section>

      <Section titulo="Resgates por Dia">
        <GraficoLinha dados={grafResgates} chave="total" />
      </Section>

    </div>
  );
}


// -------------- COMPONENTES -----------------

type CardProps = {
  titulo: string;
  valor: number;
  cor: string;
};

function Card({ titulo, valor, cor }: CardProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <p className="text-gray-400 text-xs uppercase font-bold mb-1">{titulo}</p>
      <p className="text-5xl font-black" style={{ color: cor }}>
        {valor.toLocaleString()}
      </p>
    </div>
  );
}

type SectionProps = {
  titulo: string;
  children: React.ReactNode;
};

function Section({ titulo, children }: SectionProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-[#c5a059]">{titulo}</h2>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700" style={{ height: 300 }}>
        {children}
      </div>
    </div>
  );
}

type GraficoProps = {
  dados: any[];
  chave: string;
};

function GraficoLinha({ dados, chave }: GraficoProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={chave} stroke="#c5a059" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GraficoBarra({ dados, chave }: GraficoProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" />
        <YAxis />
        <Tooltip />
        <Bar dataKey={chave} fill="#c5a059" />
      </BarChart>
    </ResponsiveContainer>
  );
}