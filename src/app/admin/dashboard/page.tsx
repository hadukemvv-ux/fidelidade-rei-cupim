'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function DashboardSimples() {
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    totalClientes: 0,
    pontosDistribuidos: 0,
    pontosResgatados: 0,
    totalResgates: 0,
    cashbackDistribuido: 0,
  });

  const [grafClientes, setGrafClientes] = useState<any[]>([]);
  const [grafPontos, setGrafPontos] = useState<any[]>([]);
  const [grafResgates, setGrafResgates] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        await Promise.all([carregarKPIs(), carregarGraficos()]);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  function ordenarPorDiaAsc(a: { dia: string }, b: { dia: string }) {
    return a.dia.localeCompare(b.dia);
  }

  function mapearContagemPorDia(rows: any[], campoData: string) {
    const mapa: Record<string, number> = {};

    rows.forEach((row) => {
      const raw = row?.[campoData];
      if (!raw || typeof raw !== 'string') return;

      const dia = raw.substring(0, 10);
      mapa[dia] = (mapa[dia] || 0) + 1;
    });

    return Object.entries(mapa)
      .map(([dia, total]) => ({ dia, total }))
      .sort(ordenarPorDiaAsc);
  }

  function mapearSomaPorDia(rows: any[], campoData: string, campoValor: string) {
    const mapa: Record<string, number> = {};

    rows.forEach((row) => {
      const raw = row?.[campoData];
      if (!raw || typeof raw !== 'string') return;

      const dia = raw.substring(0, 10);
      const valor = Number(row?.[campoValor] || 0);
      mapa[dia] = (mapa[dia] || 0) + valor;
    });

    return Object.entries(mapa)
      .map(([dia, valor]) => ({ dia, valor }))
      .sort(ordenarPorDiaAsc);
  }

  async function carregarKPIs() {
    const res = await fetchAdmin('/api/admin/dashboard', { cache: 'no-store' });
    const data = await res.json();
    const payload = data?.data ?? data;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || 'Falha ao carregar KPIs do dashboard.');
    }

    setKpis({
      totalClientes: Number(payload?.totalClientes || 0),
      pontosDistribuidos: Number(payload?.pontosDistribuidos || 0),
      pontosResgatados: Number(payload?.pontosResgatados || 0),
      totalResgates: Number(payload?.totalResgates || 0),
      cashbackDistribuido: Number(payload?.cashbackDistribuido || 0),
    });
  }

  async function carregarGraficos() {
    const res = await fetchAdmin('/api/admin/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodo: '30d' }),
      cache: 'no-store',
    });

    const data = await res.json();
    const payload = data?.data ?? data;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || 'Falha ao carregar séries do dashboard.');
    }

    setGrafClientes(mapearContagemPorDia(payload?.clientesPeriodo || [], 'atualizado_em'));
    setGrafPontos(mapearSomaPorDia(payload?.pontosEntrada || [], 'criado_em', 'valor'));
    setGrafResgates(mapearContagemPorDia(payload?.resgatesPeriodo || [], 'criado_em'));
  }

  if (loading) {
    return (
      <div className="text-[#c5a059] text-xl">Carregando dashboard...</div>
    );
  }

  return (
    <div className="space-y-12">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card titulo="Total de Clientes" valor={kpis.totalClientes} cor="white" />
        <Card titulo="Pontos Distribuidos" valor={kpis.pontosDistribuidos} cor="#c5a059" />
        <Card titulo="Pontos Resgatados" valor={kpis.pontosResgatados} cor="#e31e24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card titulo="Total de Resgates" valor={kpis.totalResgates} cor="lightgreen" />
        <Card titulo="Cashback Distribuido (R$)" valor={kpis.cashbackDistribuido} cor="skyblue" />
      </div>

      <Section titulo="Clientes Novos por Dia">
        <GraficoLinha dados={grafClientes} chave="total" />
      </Section>

      <Section titulo="Pontos Distribuidos por Dia">
        <GraficoBarra dados={grafPontos} chave="valor" />
      </Section>

      <Section titulo="Resgates por Dia">
        <GraficoLinha dados={grafResgates} chave="total" />
      </Section>

    </div>
  );
}

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
        {Number(valor || 0).toLocaleString()}
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
