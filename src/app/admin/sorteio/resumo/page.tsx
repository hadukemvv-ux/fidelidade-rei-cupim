'use client';

import { useEffect, useState } from 'react';

export default function ResumoSorteioPage() {
  const [loading, setLoading] = useState(true);
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  const withAdminToken = (url: string) => {
    if (!adminToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
  };

  const [sorteio, setSorteio] = useState<any>(null);
  const [resumo, setResumo] = useState<any>(null);

  const [erro, setErro] = useState<string | null>(null);

  // ===================== CARREGAR =====================
  useEffect(() => {
    carregarResumo();
  }, []);

  async function carregarResumo() {
    try {
      // Primeiro buscamos o sorteio atual
      const resSorteio = await fetch(withAdminToken('/api/admin/sorteio'));
      const dataSorteio = await resSorteio.json();
      const payloadSorteio = dataSorteio?.data ?? dataSorteio;

      if (!payloadSorteio?.sorteio) {
        setErro("Nenhum sorteio encontrado.");
        return;
      }

      setSorteio(payloadSorteio.sorteio);

      // Agora buscamos o resumo usando o ID
      const resResumo = await fetch(
        withAdminToken(`/api/admin/sorteio/resumo?sorteio_id=${payloadSorteio.sorteio.id}`)
      );

      const dataResumo = await resResumo.json();
      const payloadResumo = dataResumo?.data ?? dataResumo;

      if (!dataResumo?.ok) {
        setErro("Resumo não encontrado.");
        return;
      }

      setResumo(payloadResumo);

    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar resumo.");
    } finally {
      setLoading(false);
    }
  }

  // ===================== UI DE LOADING =====================
  if (loading) {
    return <p className="text-[#c5a059]">Carregando resumo...</p>;
  }

  if (erro) {
    return <p className="text-red-500">{erro}</p>;
  }

  if (!sorteio || !resumo) {
    return <p className="text-gray-400">Nenhum resumo disponível.</p>;
  }

  const dados = resumo?.resumo || resumo || {};
  const ganhador = dados?.ganhador;

  // ===================== PÁGINA =====================
  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-[#c5a059]">Resumo do Sorteio</h1>
        <p className="text-gray-400">Visualize o ganhador, auditoria e informações finais.</p>
      </div>

      {/* CARD DO SORTEIO */}
      <div className="border border-[#c5a059]/30 rounded-lg p-5 space-y-2">
        <h2 className="text-xl font-bold text-[#c5a059]">{sorteio.titulo}</h2>
        <p className="text-gray-300">{sorteio.descricao}</p>

        <p className="text-gray-400">
          <strong className="text-[#c5a059]">Data:</strong> {sorteio.data_sorteio}
        </p>

        <p className="text-gray-400">
          <strong className="text-[#c5a059]">Modo:</strong> {sorteio.modo}
        </p>

        <p className="text-gray-400">
          <strong className="text-[#c5a059]">Status:</strong> {sorteio.status}
        </p>
      </div>

      {/* GANHADOR */}
      {ganhador ? (
        <div className="border border-green-500/30 rounded-lg p-5 bg-green-900/20">
          <h2 className="text-2xl font-bold text-green-400 mb-3">
            🎉 Ganhador
          </h2>

          <p className="text-gray-200">
            <strong className="text-green-300">Nome:</strong> {ganhador.nome}
          </p>

          <p className="text-gray-200">
            <strong className="text-green-300">Telefone:</strong> {ganhador.telefone}
          </p>

          <p className="text-gray-200">
            <strong className="text-green-300">Cliente ID:</strong> {ganhador.id}
          </p>

          <p className="text-gray-200">
            <strong className="text-green-300">Tickets usados:</strong> {ganhador.tickets}
          </p>
        </div>
      ) : (
        <p className="text-gray-400">Nenhum ganhador registrado.</p>
      )}

      {/* AUDITORIA */}
      <div className="border border-[#c5a059]/20 rounded-lg p-5">
        <h2 className="text-2xl font-bold text-[#c5a059] mb-3">Auditoria</h2>

        {resumo?.auditoria ? (
          <pre className="bg-black/40 p-3 rounded text-gray-300 whitespace-pre-wrap text-sm">
            {JSON.stringify(resumo.auditoria, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-400">Nenhum registro de auditoria.</p>
        )}
      </div>

      {/* LOGS */}
      <div className="border border-[#c5a059]/20 rounded-lg p-5">
        <h2 className="text-2xl font-bold text-[#c5a059] mb-3">Logs</h2>

        {resumo?.logs?.length ? (
          <ul className="space-y-2">
            {resumo.logs.map((log: any, i: number) => (
              <li key={i} className="p-3 border border-[#c5a059]/20 rounded bg-black/30 text-gray-300">
                {log.mensagem || JSON.stringify(log)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Nenhum log registrado.</p>
        )}
      </div>

      {/* EVENTOS */}
      <div className="border border-[#c5a059]/20 rounded-lg p-5">
        <h2 className="text-2xl font-bold text-[#c5a059] mb-3">Eventos</h2>

        {resumo?.eventos?.length ? (
          <ul className="space-y-2">
            {resumo.eventos.map((ev: any, i: number) => (
              <li key={i} className="p-3 border border-[#c5a059]/20 rounded bg-black/30 text-gray-300">
                <strong className="text-[#c5a059]">{ev.tipo}</strong>
                <p>{ev.descricao}</p>
                <p className="text-sm text-gray-500">{ev.created_at}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Nenhum evento registrado.</p>
        )}
      </div>

    </div>
  );
}