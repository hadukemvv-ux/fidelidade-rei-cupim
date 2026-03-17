'use client';
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertasGarconsPage() {
  const [carregando, setCarregando] = useState(true);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [desbloqueando, setDesbloqueando] = useState<number | null>(null);
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  const withAdminToken = (url: string) => {
    if (!adminToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
  };

  async function carregarDados() {
    try {
      const res = await fetch(withAdminToken('/api/admin/garcons/analytics'));
      const json = await res.json();
      const payload = json?.data ?? json;

      setAnalytics(payload?.analytics || []);
      setResumo(payload?.resumo || {});
    } catch (err) {
      console.error("Erro ao carregar analytics:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // ================================================
  // FUNÇÃO DE DESBLOQUEIO REAL
  // ================================================
  async function desbloquearGarcom(garcom_id: number) {
    const confirmar = confirm("Tem certeza que deseja desbloquear este garçom?");
    if (!confirmar) return;

    setDesbloqueando(garcom_id);

    try {
      const resposta = await fetch(withAdminToken('/api/admin/garcons/unblock'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garcom_id,
          motivo: "Desbloqueado manualmente pelo administrador",
        }),
      });

      const json = await resposta.json();

      if (!resposta.ok) {
        alert("Erro ao desbloquear: " + json.error);
        setDesbloqueando(null);
        return;
      }

      alert("Garçom desbloqueado com sucesso!");

      // recarregar painel
      await carregarDados();
    } catch (err) {
      console.error("Erro desbloqueando:", err);
      alert("Falha ao desbloquear.");
    }

    setDesbloqueando(null);
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Carregando alertas...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">

      {/* TÍTULO */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#c5a059] uppercase tracking-wider">
            🔥 Alertas de Garçons
          </h1>
          <p className="text-gray-400 text-sm">
            Auditoria completa do sistema anti‑fraude
          </p>
        </div>

        <Link
          href="/admin/garcons"
          className="px-6 py-3 bg-gray-800 rounded-lg font-bold hover:bg-gray-700"
        >
          Voltar
        </Link>
      </div>

      {/* RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-xs uppercase mb-1 font-bold">Fraudes Detectadas</p>
          <p className="text-5xl font-black text-red-400">{resumo?.total_fraudes || 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-xs uppercase mb-1 font-bold">Suspeitas</p>
          <p className="text-5xl font-black text-yellow-400">{resumo?.total_suspeitas || 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-xs uppercase mb-1 font-bold">Garçons com Problemas</p>
          <p className="text-5xl font-black text-[#c5a059]">{resumo?.garcons_com_problemas || 0}</p>
        </div>
      </div>

      {/* LISTAGEM DETALHADA */}
      <h2 className="text-xl font-bold mb-4 text-[#c5a059]">Detalhes por Garçom</h2>

      <div className="space-y-4">
        {analytics.map((g) => {
          return (
            <div
              key={g.id}
              className="bg-gray-800 border border-gray-700 p-6 rounded-xl"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-bold">{g.nome}</h3>
                  <p className="text-gray-400 text-xs">
                    Prefixo: <strong>{g.codigo_prefixo}</strong> — Giros: {g.total_giros}
                  </p>
                </div>

                <div>
                  {g.status === "bloqueado" && (
                    <span className="px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold">
                      BLOQUEADO
                    </span>
                  )}

                  {g.status === "suspeito" && (
                    <span className="px-4 py-2 bg-yellow-500 text-black rounded-full text-xs font-bold">
                      SUSPEITO
                    </span>
                  )}

                  {g.status === "limpo" && (
                    <span className="px-4 py-2 bg-green-600 text-white rounded-full text-xs font-bold">
                      LIMPO
                    </span>
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                  <p className="text-sm text-gray-500">Fraudes</p>
                  <p className="text-3xl font-black text-red-400">{g.fraudes}</p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                  <p className="text-sm text-gray-500">Suspeitas</p>
                  <p className="text-3xl font-black text-yellow-400">{g.suspeitas}</p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                  <p className="text-sm text-gray-500">Logs (3 dias)</p>
                  <p className="text-3xl font-black text-[#c5a059]">{g.total_logs}</p>
                </div>
              </div>

              {/* Último evento */}
              {g.ultimo_evento && (
                <div className="bg-black/30 p-4 rounded-xl border border-gray-700 mt-4">
                  <h4 className="font-bold text-[#c5a059] text-lg mb-2">Último Evento</h4>

                  <p className="text-sm text-gray-400 mb-1">
                    <strong>Telefone:</strong> {g.ultimo_evento.telefone_cliente || "N/A"}
                  </p>

                  <p className="text-sm text-gray-400 mb-1">
                    <strong>Score:</strong> {g.ultimo_evento.score}
                  </p>

                  <p className="text-sm text-gray-400 mb-1">
                    <strong>IP:</strong> {g.ultimo_evento.ip}
                  </p>

                  <p className="text-sm text-gray-400 mb-1">
                    <strong>Motivo:</strong> {g.ultimo_evento.motivo}
                  </p>

                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(g.ultimo_evento.criado_em).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/admin/garcons?id=${g.id}`}
                  className="flex-1 py-3 bg-gray-700 text-center text-sm rounded-lg hover:bg-gray-600"
                >
                  Ver Perfil
                </Link>

                {g.fraudes > 0 && (
                  <button
                    onClick={() => desbloquearGarcom(g.id)}
                    className="flex-1 py-3 bg-red-600 text-sm rounded-lg hover:bg-red-500 disabled:bg-red-900"
                    disabled={desbloqueando === g.id}
                  >
                    {desbloqueando === g.id ? "Desbloqueando..." : "Desbloquear"}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}