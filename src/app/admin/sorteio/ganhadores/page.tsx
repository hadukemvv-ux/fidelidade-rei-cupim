'use client';

import { fetchAdmin } from '@/lib/adminFetch';
import { useEffect, useState } from 'react';

export default function GanhadoresPage() {
  const [loading, setLoading] = useState(true);
  const [ganhadores, setGanhadores] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarGanhadores();
  }, []);

  async function carregarGanhadores() {
    try {
      const res = await fetchAdmin('/api/admin/sorteio/ganhadores');
      const data = await res.json();
      const payload = data?.data ?? data;

      if (!payload?.ganhadores) {
        setErro('Nenhum registro encontrado.');
      } else {
        setGanhadores(payload.ganhadores);
      }

    } catch (error) {
      console.error(error);
      setErro('Erro ao carregar ganhadores.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-[#c5a059]">Carregando ganhadores...</p>;
  }

  if (erro) {
    return <p className="text-red-500">{erro}</p>;
  }

  if (ganhadores.length === 0) {
    return <p className="text-gray-400">Nenhum ganhador registrado até o momento.</p>;
  }

  return (
    <div className="space-y-10">
      
      {/* TÍTULO */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Ganhadores</h1>
        <p className="text-gray-400">Lista completa de vencedores dos sorteios.</p>
      </div>

      {/* TABELA DE GANHADORES */}
      <div className="overflow-x-auto border border-[#c5a059]/20 rounded-lg">
        <table className="w-full border-collapse min-w-[600px]">

          <thead>
            <tr className="bg-[#c5a059]/20 text-[#c5a059] text-left">
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Sorteio</th>
              <th className="p-3 text-center">Data</th>
            </tr>
          </thead>

          <tbody>
            {ganhadores.map((g, i) => (
              <tr key={i} className="border-b border-[#c5a059]/10 text-gray-200">
                <td className="p-3">{g.nome}</td>
                <td className="p-3">{g.telefone}</td>
                <td className="p-3">{g.sorteio_titulo}</td>
                <td className="p-3 text-center">
                  {g.created_at ? new Date(g.created_at).toLocaleString('pt-BR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  );
}