'use client';
import { fetchAdmin } from '@/lib/adminFetch';
import { useState, useEffect } from 'react';

type PremioRoleta = {
  id: number;
  nome: string;
  emoji: string;
  descricao_vitoria?: string;
  probabilidade: number;
  [key: string]: unknown;
};

async function fetchPremios() {
  const response = await fetchAdmin('/api/admin/premios');
  const json = await response.json();
  if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível carregar os prêmios.');
  const payload = json?.data ?? json;
  return (payload?.premios || payload || []) as PremioRoleta[];
}

export default function AdminRoletaPage() {
  const [premios, setPremios] = useState<PremioRoleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await fetchPremios();
        if (active) setPremios(result);
      } catch {
        if (active) setPremios([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function salvarItem(item: PremioRoleta) {
    try {
      const response = await fetchAdmin('/api/admin/premios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Não foi possível salvar o prêmio.');
      alert('Item atualizado com sucesso!');
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'Erro ao salvar.');
    }
  }

  const handleChange = (index: number, field: keyof PremioRoleta, value: string | number) => {
    setPremios(prev =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="space-y-12">

      {/* HEADER AUTOMÁTICO DO LAYOUT */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Configuração da Roleta</h1>
        <p className="text-gray-400">Gerencie prêmios, probabilidades e exibição.</p>
      </div>

      {loading ? (
        <p className="text-center animate-pulse">Carregando prêmios...</p>
      ) : (
        <div className="grid gap-6">
          {premios.map((p, i) => (
            <div
              key={p.id}
              className="bg-gray-800 p-6 rounded-2xl flex flex-col gap-4 border border-gray-700 shadow-xl hover:border-[#c5a059]/50 transition-colors"
            >
              {/* Topo / Emoji / Nome */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-gray-700 pb-4">

                <div className="w-12 h-12 flex items-center justify-center text-3xl bg-black rounded-xl shadow-inner shrink-0">
                  {p.emoji}
                </div>

                <div className="flex-1 w-full">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1 block">
                    Nome do Prêmio
                  </label>
                  <input
                    value={p.nome}
                    onChange={e => handleChange(i, 'nome', e.target.value)}
                    className="w-full bg-black/30 border border-gray-600 rounded-lg p-2 text-lg font-bold text-white focus:border-[#c5a059] outline-none"
                  />
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => salvarItem(p)}
                    className="w-full md:w-auto bg-[#c5a059] text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    SALVAR
                  </button>
                </div>
              </div>

              {/* Campos inferiores */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

                <div className="md:col-span-2">
                  <label className="text-[10px] text-[#c5a059] font-black uppercase tracking-widest mb-1 block">
                    Frase de Vitória
                  </label>
                  <input
                    value={p.descricao_vitoria || ''}
                    onChange={e => handleChange(i, 'descricao_vitoria', e.target.value)}
                    className="w-full bg-black/50 border border-gray-600 rounded-xl p-3 text-sm focus:border-[#c5a059]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                    Emoji
                  </label>
                  <input
                    value={p.emoji}
                    onChange={e => handleChange(i, 'emoji', e.target.value)}
                    className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-sm text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">
                    Probabilidade
                  </label>
                  <input
                    type="number"
                    value={p.probabilidade}
                    onChange={e => handleChange(i, 'probabilidade', parseInt(e.target.value))}
                    className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-sm"
                  />
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
