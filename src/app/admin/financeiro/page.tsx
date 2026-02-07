'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer
} from 'recharts';

export default function FinanceiroPage() {
  const [overview, setOverview] = useState<any>(null);
  const [porDia, setPorDia] = useState<any>(null);
  const [porMes, setPorMes] = useState<any>(null);
  const [clientes, setClientes] = useState<any>(null);
  const [fidelidade, setFidelidade] = useState<any>(null);
  const [categorias, setCategorias] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const [o, d, m, c, f, cat] = await Promise.all([
        fetch('/api/financeiro/overview').then(r => r.json()),
        fetch('/api/financeiro/por-dia').then(r => r.json()),
        fetch('/api/financeiro/por-mes').then(r => r.json()),
        fetch('/api/financeiro/clientes').then(r => r.json()),
        fetch('/api/financeiro/fidelidade').then(r => r.json()),
        fetch('/api/financeiro/categorias').then(r => r.json())
      ]);

      setOverview(o);
      setPorDia(d);
      setPorMes(m);
      setClientes(c);
      setFidelidade(f);
      setCategorias(cat);

    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-[#c5a059] animate-pulse">Carregando dados financeiros...</p>;
  }

  return (
    <div className="space-y-10">

      {/* ====================== TÍTULO ====================== */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Financeiro</h1>
        <p className="text-gray-400">Visão geral do desempenho financeiro da empresa</p>
      </div>

      {/* ====================== KPIs ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <CardKPI
          titulo="Faturamento Total"
          valor={`R$ ${(overview?.faturamento_total ?? 0).toFixed(2)}`}
        />

        <CardKPI
          titulo="Ticket Médio"
          valor={`R$ ${(overview?.ticket_medio ?? 0).toFixed(2)}`}
        />

        <CardKPI
          titulo="Total de Pedidos"
          valor={overview?.total_pedidos ?? 0}
        />
      </div>

      {/* ====================== NOVOS X RECORRENTES ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardKPI
          titulo="Clientes Únicos"
          valor={overview?.clientes_unicos ?? 0}
        />

        <CardKPI
          titulo="Novos (30 dias)"
          valor={overview?.novos_clientes_30dias ?? 0}
        />

        <CardKPI
          titulo="Recorrentes"
          valor={overview?.clientes_recorrentes ?? 0}
        />
      </div>

      {/* ====================== GRÁFICO DIÁRIO ====================== */}
      <Section titulo="Faturamento dos Últimos 30 dias">
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={porDia?.dias ?? []}>
              <Line type="monotone" dataKey="faturamento" stroke="#c5a059" strokeWidth={3} />
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="data" tick={{ fill: '#aaa' }} />
              <YAxis tick={{ fill: '#aaa' }} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ====================== GRÁFICO MENSAL ====================== */}
      <Section titulo="Faturamento Mensal (12 meses)">
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={porMes?.meses ?? []}>
              <Bar dataKey="faturamento" fill="#c5a059" />
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: '#aaa' }} />
              <YAxis tick={{ fill: '#aaa' }} />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ====================== RANKING DE CLIENTES ====================== */}
      <Section titulo="Top 10 Clientes (por gasto)">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <ul className="space-y-3">
            {(clientes?.top10 ?? []).map((c: any) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>
                  <strong className="text-[#c5a059]">{c.posicao}º</strong> — {c.nome}
                </span>
                <span>R$ {(c.total_gasto ?? 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ====================== IMPACTO DO PROGRAMA DE FIDELIDADE ====================== */}
      <Section titulo="Impacto do Programa de Fidelidade">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <CardKPI
            titulo="Pontos Acumulados"
            valor={fidelidade?.total_pontos ?? 0}
          />

          <CardKPI
            titulo="Cashback Acumulado"
            valor={`R$ ${(fidelidade?.total_cashback ?? 0).toFixed(2)}`}
          />

          <CardKPI
            titulo="Custo Total do Programa"
            valor={`R$ ${(fidelidade?.custo_programa ?? 0).toFixed(2)}`}
          />
        </div>
      </Section>

      {/* ====================== CATEGORIAS DO CARDÁPIO ====================== */}
      <Section titulo="Categorias Mais Populares (Resgates)">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          {Object.entries(categorias?.categorias ?? {}).map(([categoria, qtd]) => (
  <p key={categoria} className="text-sm flex justify-between py-1">
    <span>{categoria}</span>
    <span className="text-[#c5a059] font-bold">{qtd as number}</span>
  </p>
))}
        </div>
      </Section>

    </div>
  );
}

/* ========================================================
   COMPONENTES REUTILIZÁVEIS
======================================================== */

function CardKPI({ titulo, valor }: any) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow">
      <p className="text-xs text-gray-400 uppercase">{titulo}</p>
      <h2 className="text-3xl font-black text-white mt-1">{valor}</h2>
    </div>
  );
}

function Section({ titulo, children }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#c5a059]">{titulo}</h2>
      {children}
    </div>
  );
}