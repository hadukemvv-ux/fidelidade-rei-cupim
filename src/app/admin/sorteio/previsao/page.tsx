'use client';

import { useEffect, useState } from 'react';

export default function SorteioPrevisaoPage() {
  const [loading, setLoading] = useState(true);
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  const withAdminToken = (url: string) => {
    if (!adminToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
  };

  const [sorteio, setSorteio] = useState<any>(null);
  const [previsao, setPrevisao] = useState<any>(null);

  const [erro, setErro] = useState<string | null>(null);

  const [mostrarTodos, setMostrarTodos] = useState(false);

  useEffect(() => {
    carregarPrevisao();
  }, []);

  async function carregarPrevisao() {
  try {
      const res = await fetch(withAdminToken('/api/admin/sorteio/previsao'));
    const data = await res.json();
      const payload = data?.data ?? data;

    if (!data?.ok) {
      setErro('Nenhum sorteio ativo encontrado.');
      return;
    }

      if (!payload?.sorteio) {
      setErro('Nenhum sorteio ativo encontrado.');
      return;
    }

      setSorteio(payload.sorteio);

    setPrevisao({
        total_participantes: payload.total_participantes,
        total_tickets: payload.total_tickets,
        top_10: payload.top10,
        clientes: payload.participantes
    });

  } catch (error) {
    console.error(error);
    setErro('Erro ao carregar previsão.');
  } finally {
    setLoading(false);
  }
}

  if (loading) {
    return <p className="text-[#c5a059]">Carregando previsão...</p>;
  }

  if (erro) {
    return <p className="text-red-500">{erro}</p>;
  }

  if (!sorteio || !previsao) {
    return <p className="text-gray-400">Nenhuma previsão disponível.</p>;
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Previsão do Sorteio</h1>
        <p className="text-gray-400">Veja chances, participantes e total de tickets.</p>
      </div>

      {/* CARD DO SORTEIO */}
      <div className="border border-[#c5a059]/30 rounded-lg p-5">
        <h2 className="text-xl font-bold text-[#c5a059]">{sorteio.titulo}</h2>
        <p className="text-gray-300 mb-3">{sorteio.descricao}</p>

        <p className="text-gray-400">
          <strong className="text-[#c5a059]">Data do sorteio:</strong> {sorteio.data_sorteio}
        </p>

        <p className="text-gray-400">
          <strong className="text-[#c5a059]">Modo:</strong> {sorteio.modo}
        </p>
      </div>

      {/* RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-[#c5a059]/10 rounded-lg p-4 border border-[#c5a059]/20">
          <p className="text-gray-400">Participantes</p>
          <p className="text-3xl font-black text-[#c5a059]">{previsao.total_participantes}</p>
        </div>

        <div className="bg-[#c5a059]/10 rounded-lg p-4 border border-[#c5a059]/20">
          <p className="text-gray-400">Total de Tickets</p>
          <p className="text-3xl font-black text-[#c5a059]">{previsao.total_tickets}</p>
        </div>

        <div className="bg-[#c5a059]/10 rounded-lg p-4 border border-[#c5a059]/20">
          <p className="text-gray-400">Líder</p>
          <p className="text-2xl font-bold text-[#c5a059]">
            {previsao.top_10?.[0]?.nome || '—'}
          </p>
        </div>

      </div>

      {/* TOP 10 */}
      <div>
        <h2 className="text-2xl font-bold text-[#c5a059] mb-4">Top 10 Participantes</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

          {previsao.top_10.map((c: any, i: number) => (
            <div
              key={i}
              className="p-4 border border-[#c5a059]/30 rounded-lg text-center bg-black/20"
            >
              <div className="text-[#c5a059] font-bold text-xl">{i + 1}º</div>

              <div className="text-white font-semibold mt-2">
                {c.nome}
              </div>

              <div className="text-gray-400 text-sm mt-1">
                {c.tickets} tickets
              </div>

              <div className="text-gray-500 text-xs">
                {c.chance_percentual}% de chance
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* BOTÃO PARA MOSTRAR TODOS */}
      <div className="text-center mt-8">
        {!mostrarTodos && (
          <button
            onClick={() => setMostrarTodos(true)}
            className="px-6 py-3 bg-[#c5a059] text-black rounded-lg font-bold hover:bg-[#d4b16a] transition"
          >
            Mostrar todos os participantes
          </button>
        )}
      </div>

      {/* LISTA COMPLETA */}
      {mostrarTodos && (
        <div>
          <h2 className="text-2xl font-bold text-[#c5a059] mb-4">Lista Completa</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#c5a059]/20 text-[#c5a059]">
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Telefone</th>
                  <th className="p-3 text-center">Tickets</th>
                  <th className="p-3 text-center">Chance (%)</th>
                </tr>
              </thead>

              <tbody>
                {previsao.clientes.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-[#c5a059]/20 text-gray-200">
                    <td className="p-3">{c.nome}</td>
                    <td className="p-3">{c.telefone}</td>
                    <td className="p-3 text-center">{c.tickets}</td>
                    <td className="p-3 text-center">{c.chance_percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}