'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {

  const router = useRouter();

  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [stats, setStats] = useState({
    pontosDistribuidos: 0,
    totalClientes: 0
  });

  // --- VERIFICAR LOGIN ---
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setAutorizado(true);
        fetchStats();
      }
      setVerificando(false);
    }
    checkSession();
  }, [router]);

  // --- ESTATÍSTICAS ---
  async function fetchStats() {
    const { data: pontosData } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'entrada');

    const totalPontos =
      pontosData?.reduce((soma: number, curr: any) => soma + curr.valor, 0) || 0;

    const { count } = await supabase
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true });

    setStats({
      pontosDistribuidos: totalPontos,
      totalClientes: count || 0
    });
  }

  if (verificando)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-[#c5a059] text-xl">
        Verificando…
      </div>
    );

  if (!autorizado) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 pb-28">

      {/* HEADER */}
      <header className="mb-10 border-b border-gray-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#c5a059] tracking-widest uppercase">
            👑 Administração Cupim
          </h1>
          <p className="text-gray-400 mt-1">Gerenciamento geral do sistema</p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }}
          className="text-red-400 border border-red-900 px-4 py-2 rounded text-xs hover:bg-red-900/20"
        >
          SAIR
        </button>
      </header>

      {/* -------------------- ESTATÍSTICAS -------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

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

      {/* -------------------- BOTÃO IMPORTADOR MANUAL (NOVO) -------------------- */}
      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl mb-12">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          📥 Importador Manual (Novo)
        </h2>

        <p className="text-gray-400 text-sm mb-4">
          Clique abaixo para acessar o novo importador seguro que envia a planilha para o backend.
        </p>

        <Link
          href="/admin/importar"
          className="inline-block bg-[#c5a059] text-black px-8 py-4 rounded-xl font-bold hover:bg-[#b08d45] transition shadow-lg"
        >
          Abrir Importador Manual
        </Link>
      </div>

      {/* -------------------- MENU PRINCIPAL -------------------- */}
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
        Ferramentas de Operação
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <Link href="/admin/dashboard" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-400 transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3 group-hover:scale-110 transition">📊</div>
          <div className="font-bold text-blue-300 text-sm">Dashboard</div>
        </Link>

        <Link href="/admin/roleta" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-[#c5a059] transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3 group-hover:scale-110 transition">⚙️</div>
          <div className="font-bold text-[#c5a059] text-sm">Roleta</div>
        </Link>

        <Link href="/validar" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-400 transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3 group-hover:scale-110 transition">✅</div>
          <div className="font-bold text-gray-200 text-sm">Validar Cupom</div>
        </Link>

        <Link href="/admin/sorteio" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-yellow-400 transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3">🎁</div>
          <div className="font-bold text-[#c5a059] text-sm">Sorteio</div>
        </Link>

        <Link href="/admin/cardapio" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-[#c5a059] transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3">🍔</div>
          <div className="font-bold text-[#c5a059] text-sm">Cardápio</div>
        </Link>

        <Link href="/admin/garcons" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-[#c5a059] transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3">👔</div>
          <div className="font-bold text-[#c5a059] text-sm">Equipe</div>
        </Link>

        <Link href="/admin/garcons/alertas" className="bg-gray-800 p-6 rounded-xl border border-red-800 hover:border-red-400 transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3">🔥</div>
          <div className="font-bold text-red-400 text-sm">Anti‑Fraude</div>
        </Link>

        <Link href="/roleta" target="_blank" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-400 transition text-center group flex flex-col items-center">
          <div className="text-4xl mb-3">🎰</div>
          <div className="font-bold text-gray-300 text-sm">Abrir Roleta</div>
        </Link>

      </div>

    </div>
  );
}