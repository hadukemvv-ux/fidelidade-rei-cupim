'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchAdmin } from '@/lib/adminFetch';

type DashboardStats = {
  pontosDistribuidos: number;
  totalClientes: number;
};

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats>({
    pontosDistribuidos: 0,
    totalClientes: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetchAdmin('/api/admin/dashboard');
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Falha ao carregar o painel.');
        setStats({
          pontosDistribuidos: Number(payload.data?.pontosDistribuidos || 0),
          totalClientes: Number(payload.data?.totalClientes || 0),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Falha ao carregar o painel.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-[#c5a059] text-lg">
        Carregando dados...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-12">

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">
            Pontos Distribuídos
          </p>
          <p className="text-5xl font-black text-[#c5a059]">
            {stats.pontosDistribuidos.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">
            Base de Clientes
          </p>
          <p className="text-5xl font-black text-white">
            {stats.totalClientes.toLocaleString()}
          </p>
        </div>

      </div>

      {/* IMPORTADOR */}
      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          📥 Importador Manual
        </h2>

        <p className="text-gray-400 text-sm mb-4">
          Envie planilhas direto para o backend.
        </p>

        <Link
          href="/admin/importar"
          className="inline-block bg-[#c5a059] text-black px-8 py-4 rounded-xl font-bold hover:bg-[#b08d45] transition shadow-lg"
        >
          Abrir Importador Manual
        </Link>
      </div>

      {/* MENU */}
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
        Ferramentas de Operação
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <Menu icon="📊" cor="blue" href="/admin/dashboard" label="Dashboard" />
        <Menu icon="📈" cor="green" href="/admin/analytics" label="Analytics" />
        <Menu icon="🎰" cor="purple" href="/admin/roleta" label="Roleta" />
        <Menu icon="🎁" cor="yellow" href="/admin/sorteio" label="Sorteio" />
        <Menu icon="🍔" cor="#c5a059" href="/admin/cardapio" label="Cardápio" />
        <Menu icon="👔" cor="#c5a059" href="/admin/garcons" label="Equipe" />
        <Menu icon="🔥" cor="red" href="/admin/garcons/alertas" label="Anti-Fraude" />
        <Menu icon="🎰" cor="gray" href="/roleta" target="_blank" label="Abrir Roleta" />

      </div>

    </div>
  );
}

type MenuProps = {
  icon: string;
  label: string;
  href: string;
  cor: string;
  target?: string; // opcional
};

function Menu({ icon, label, href, cor, target = "_self" }: MenuProps) {
  return (
    <Link
      href={href}
      target={target}
      className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center group flex flex-col items-center hover:border-[#c5a059] transition"
    >
      <div className="text-4xl mb-3 group-hover:scale-110 transition">{icon}</div>
      <div className="font-bold text-sm" style={{ color: cor }}>{label}</div>
    </Link>
  );
}
