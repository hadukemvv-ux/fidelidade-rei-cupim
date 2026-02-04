'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalClientes: 0,
    pontosDistribuidos: 0,
    premiosEntregues: 0,
    girosRoleta: 0,
    saldoMedioClientes: 0
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/dashboard'); // Nova rota
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-[#c5a059] flex items-center justify-center">
        Carregando Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 font-sans">
      
      <header className="mb-10 flex justify-between items-center border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-3xl font-black text-[#c5a059] uppercase tracking-wider">📊 Dashboard Geral</h1>
          <p className="text-gray-400 text-sm mt-1">Visão geral do programa de fidelidade</p>
        </div>

        <Link 
          href="/admin"
          className="text-xs font-bold px-4 py-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700"
        >
          ⬅ Voltar
        </Link>
      </header>


      {/* --- CARDS SUPERIORES --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs uppercase font-bold mb-1">Total de Clientes</p>
          <p className="text-5xl font-black text-white">{stats.totalClientes.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs uppercase font-bold mb-1">Pontos Distribuídos</p>
          <p className="text-5xl font-black text-[#c5a059]">{stats.pontosDistribuidos.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs uppercase font-bold mb-1">Prêmios entregues</p>
          <p className="text-5xl font-black text-green-400">{stats.premiosEntregues.toLocaleString()}</p>
        </div>

      </div>


      {/* --- SEGUNDA LINHA DE CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs uppercase font-bold mb-1">Giros da Roleta</p>
          <p className="text-5xl font-black text-purple-400">{stats.girosRoleta.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs uppercase font-bold mb-1">Saldo Médio</p>
          <p className="text-5xl font-black text-blue-400">{stats.saldoMedioClientes.toFixed(0)} pts</p>
        </div>

      </div>
    </div>
  );
}