"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PerfilGarcomPage() {
  const params = useParams() as { id: string };
const garcomId = params.id;

  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"resumo" | "eventos" | "graficos">("resumo");
  const [subAba, setSubAba] = useState<"score" | "radar" | "ips" | "comparativo">("score");

  const [garcom, setGarcom] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState("limpo");
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  const withAdminToken = (url: string) => {
    if (!adminToken) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(adminToken)}`;
  };

  async function carregarDados() {
    try {
      const analyticsRes = await fetch(withAdminToken('/api/admin/garcons/analytics'));
      const analyticsJson = await analyticsRes.json();
      const analyticsPayload = analyticsJson?.data ?? analyticsJson;

      setAnalytics(analyticsPayload?.analytics || []);

      const encontrado = (analyticsPayload?.analytics || []).find((g: any) => g.id == garcomId);
      setGarcom(encontrado);

      if (encontrado) setStatus(encontrado.status);

      const logsRes = await fetch(withAdminToken(`/api/admin/garcons/logs?id=${garcomId}`));
      const logsJson = await logsRes.json();
      const logsPayload = logsJson?.data ?? logsJson;
      setLogs(logsPayload?.logs || logsPayload || []);

    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function desbloquear() {
    if (!confirm("Desbloquear este garçom?")) return;

    setDesbloqueando(true);

    try {
      await fetch(withAdminToken('/api/admin/garcons/unblock'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garcom_id: garcomId,
          motivo: "Desbloqueado manualmente pelo administrador",
        }),
      });

      alert("Garçom desbloqueado!");
      carregarDados();
    } catch {
      alert("Erro ao desbloquear.");
    } finally {
      setDesbloqueando(false);
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Carregando perfil...
      </div>
    );
  }

  if (!garcom) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-10 text-center">
        <h1 className="text-2xl">Garçom não encontrado</h1>
        <Link href="/admin/garcons" className="text-[#c5a059] underline mt-4 block">
          Voltar
        </Link>
      </div>
    );
  }

  // === AGRUPAR LOGS POR IP ===
  const ipsAgrupados = logs.reduce((acc: any, l) => {
    const ip = l.ip || "desconhecido";
    if (!acc[ip]) acc[ip] = { ip, total: 0, scores: [] };
    acc[ip].total++;
    acc[ip].scores.push(l.score);
    return acc;
  }, {});

  const ipsArray = Object.values(ipsAgrupados);

  // === DADOS PARA RADAR ===
  const radarData = {
    frequencia: Math.min(logs.length * 2, 100),
    mediaScore: Math.min(
      logs.length > 0 ? (logs.reduce((a, b) => a + b.score, 0) / logs.length) * 10 : 0,
      100
    ),
    fraudes: Math.min(garcom.fraudes * 20, 100),
    suspeitas: Math.min(garcom.suspeitas * 20, 100),
    telefones: Math.min(new Set(logs.map((l) => l.telefone_cliente)).size * 20, 100),
    ips: Math.min(ipsArray.length * 20, 100),
  };

  // === COMPARATIVO ===
  const melhor = Math.max(...analytics.map((g) => g.total_giros));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#c5a059] uppercase tracking-wider">
            👔 {garcom.nome}
          </h1>
          <p className="text-gray-400 text-sm">Perfil completo do garçom</p>
        </div>

        <Link
          href="/admin/garcons"
          className="px-6 py-3 bg-gray-800 rounded-lg font-bold hover:bg-gray-700"
        >
          Voltar
        </Link>
      </div>

      {/* ABAS PRINCIPAIS */}
      <div className="flex gap-4 mb-10 border-b border-gray-700 pb-3">
        {[
          { id: "resumo", label: "Resumo" },
          { id: "eventos", label: "Eventos" },
          { id: "graficos", label: "Gráficos" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`
              px-4 py-2 rounded-lg font-bold text-sm transition
              ${
                aba === tab.id
                  ? "bg-[#c5a059] text-black"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================
          ABA: RESUMO
      ============================ */}
      {aba === "resumo" && (
        <div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-1">Status</p>
              <p className={`text-4xl font-black ${
                status === "bloqueado"
                  ? "text-red-400"
                  : status === "suspeito"
                  ? "text-yellow-400"
                  : "text-green-400"
              }`}>
                {status.toUpperCase()}
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-1">Total de Giros</p>
              <p className="text-4xl font-black text-white">{garcom.total_giros}</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
              <p className="text-gray-500 text-xs mb-1">Prefixo</p>
              <p className="text-4xl font-black text-[#c5a059]">{garcom.codigo_prefixo}</p>
            </div>
          </div>

          {status === "bloqueado" && (
            <button
              onClick={desbloquear}
              disabled={desbloqueando}
              className="w-full py-4 bg-red-600 rounded-xl font-bold hover:bg-red-500 disabled:bg-red-900 mb-12"
            >
              {desbloqueando ? "Desbloqueando..." : "Desbloquear Garçom"}
            </button>
          )}
        </div>
      )}

      {/* ============================
          ABA: EVENTOS
      ============================ */}
      {aba === "eventos" && (
        <div>
          <h2 className="text-xl font-bold text-[#c5a059] mb-4">Eventos Recentes</h2>

          <div className="space-y-4">
            {logs.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 border border-gray-700 p-4 rounded-xl"
              >
                <p className="text-sm">
                  <strong className="text-[#c5a059]">{item.premio}</strong> — Score:{" "}
                  <span className="text-yellow-400">{item.score}</span>
                </p>

                {item.telefone_cliente && (
                  <p className="text-xs text-gray-400 mt-1">Telefone: {item.telefone_cliente}</p>
                )}

                <p className="text-xs text-gray-400">IP: {item.ip}</p>

                <p className="text-xs text-gray-500 mt-1 italic">{item.motivo}</p>

                <p className="text-[10px] text-gray-600 mt-1">
                  {new Date(item.criado_em).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================
          ABA: GRÁFICOS
      ============================ */}
      {aba === "graficos" && (
        <div>

          {/* SUB-ABAS */}
          <div className="flex gap-4 mb-8">
            {[
              { id: "score", label: "Score" },
              { id: "radar", label: "Radar" },
              { id: "ips", label: "Mapa de IPs" },
              { id: "comparativo", label: "Comparativo" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSubAba(s.id as any)}
                className={`
                  px-4 py-2 rounded-lg font-bold text-xs transition
                  ${
                    subAba === s.id
                      ? "bg-[#c5a059] text-black"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }
                `}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* === Gráfico SCORE === */}
          {subAba === "score" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold text-[#c5a059] mb-4">Score ao longo do tempo</h3>

              <svg width="100%" height="180">
                <polyline
                  fill="none"
                  stroke="#c5a059"
                  strokeWidth="3"
                  points={logs
                    .slice(0, 30)
                    .reverse()
                    .map((l, i) => `${i * 20},${180 - l.score}`)
                    .join(" ")}
                />
              </svg>
            </div>
          )}

          {/* === Gráfico RADAR === */}
          {subAba === "radar" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

              <h3 className="text-lg font-bold text-[#c5a059] mb-6">Radar de Risco</h3>

              <div className="flex justify-center">
                <svg width="300" height="300" viewBox="0 0 200 200">

                  {/* Hexágono */}
                  {[20, 40, 60, 80].map((r, idx) => (
                    <polygon
                      key={idx}
                      points={`
                        100,${100 - r}
                        ${100 + r * 0.87},${100 - r / 2}
                        ${100 + r * 0.87},${100 + r / 2}
                        100,${100 + r}
                        ${100 - r * 0.87},${100 + r / 2}
                        ${100 - r * 0.87},${100 - r / 2}
                      `}
                      fill="none"
                      stroke="#444"
                    />
                  ))}

                  {/* Área do radar */}
                  <polygon
                    fill="rgba(197,160,89,0.4)"
                    stroke="#c5a059"
                    strokeWidth="2"
                    points={`
                      100,${100 - radarData.frequencia}
                      ${100 + radarData.mediaScore * 0.87 / 1.2},${100 - radarData.mediaScore / 2}
                      ${100 + radarData.fraudes * 0.87 / 1.2},${100 + radarData.fraudes / 2}
                      100,${100 + radarData.suspeitas}
                      ${100 - radarData.telefones * 0.87 / 1.2},${100 + radarData.telefones / 2}
                      ${100 - radarData.ips * 0.87 / 1.2},${100 - radarData.ips / 2}
                    `}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* === Mapa neural de IPs === */}
          {subAba === "ips" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

              <h3 className="text-lg font-bold text-[#c5a059] mb-6">Mapa Neural de IPs</h3>

              <div className="flex justify-center relative h-[300px]">

                {/* NÓ CENTRAL (GARÇOM) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 rounded-full bg-[#c5a059] text-black font-bold flex items-center justify-center shadow-xl">
                    {garcom.nome.split(" ")[0]}
                  </div>
                </div>

                {/* IPs distribuidos */}
                {ipsArray.map((ipData: any, index: number) => {
                  const total = ipData.total;
                  const angle = index * (360 / ipsArray.length);
                  const radius = 120;
                  const x = 150 + radius * Math.cos((angle * Math.PI) / 180);
                  const y = 150 + radius * Math.sin((angle * Math.PI) / 180);

                  return (
                    <div
                      key={ipData.ip}
                      className="absolute"
                      style={{
                        left: x + "px",
                        top: y + "px",
                        transform: "translate(-50%,-50%)",
                      }}
                    >
                      {/* Linha conectando */}
                      <svg className="absolute -z-10" width="200" height="200">
                        <line
                          x1="100"
                          y1="100"
                          x2={x - 50}
                          y2={y - 50}
                          stroke="#555"
                          strokeWidth="2"
                        />
                      </svg>

                      <div
                        className="rounded-full bg-gray-700 border border-gray-500 p-3 text-center text-xs shadow-lg"
                        style={{
                          width: 60 + total * 5 + "px",
                          height: 60 + total * 5 + "px",
                        }}
                      >
                        <p className="text-[#c5a059] font-bold">{ipData.ip}</p>
                        <p className="text-gray-300">{total}x</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === COMPARATIVO ENTRE GARÇONS === */}
          {subAba === "comparativo" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold text-[#c5a059] mb-6">Comparativo entre Garçons</h3>

              {analytics.map((g: any) => (
                <div key={g.id} className="mb-4">
                  <p className="text-sm mb-1">{g.nome}</p>
                  <div className="h-3 bg-gray-700 rounded-xl overflow-hidden">
                    <div
                      className="bg-[#c5a059] h-full"
                      style={{
                        width: `${(g.total_giros / melhor) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}