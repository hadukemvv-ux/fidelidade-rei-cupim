"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdmin } from "@/lib/adminFetch";
import { useAdminCanChange } from "../adminAccessContext";
import styles from "./roleta-admin.module.css";

type Prize = {
  id: number; codigo: string; nome: string; emoji: string; descricao_vitoria: string | null;
  descricao_operacional: string | null; ativo: boolean; participa_roleta: boolean;
  canal_uso: "presencial" | "delivery" | "ambos";
  custo_estimado: number; expira_em_dias: number; pesos_nivel: number[];
};
type RawPrize = Partial<Prize> & { id: number; versao: number };
type Config = { v2_publicada: boolean; v2_modo_teste: boolean } | null;
const levels = ["Até R$ 100", "R$ 100–200", "R$ 200–300", "R$ 300–400", "R$ 400–500", "Acima de R$ 500"];

function normalize(raw: RawPrize): Prize {
  return {
    id: Number(raw.id), codigo: raw.codigo || "", nome: raw.nome || "Prêmio", emoji: raw.emoji || "🎁",
    descricao_vitoria: raw.descricao_vitoria || null, descricao_operacional: raw.descricao_operacional || null,
    ativo: Boolean(raw.ativo), participa_roleta: Boolean(raw.participa_roleta), canal_uso: raw.canal_uso || "ambos",
    custo_estimado: Number(raw.custo_estimado || 0), expira_em_dias: Number(raw.expira_em_dias || 14),
    pesos_nivel: Array.from({ length: 6 }, (_, index) => Number(raw.pesos_nivel?.[index] || 0)),
  };
}

export default function AdminRoletaV2() {
  const canChange = useAdminCanChange();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [config, setConfig] = useState<Config>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [view, setView] = useState<"pilot" | "drafts">("pilot");

  const load = useCallback(async () => {
    const response = await fetchAdmin("/api/admin/premios", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error || "Não foi possível carregar os prêmios.");
    setPrizes(((json.data?.premios || []) as RawPrize[]).filter((item) => Number(item.versao) === 2).map(normalize));
    setConfig(json.data?.configuracao || null);
  }, []);
  useEffect(() => { load().catch((error) => setNotice(error instanceof Error ? error.message : "Falha ao carregar.")); }, [load]);

  const pilot = prizes.filter((prize) => prize.codigo === "piloto_interno_sem_valor_v2");
  const drafts = prizes.filter((prize) => prize.codigo !== "piloto_interno_sem_valor_v2");
  const shown = view === "pilot" ? pilot : drafts;
  const odds = useMemo(() => {
    const eligible = prizes.filter((prize) => prize.ativo && prize.participa_roleta);
    const total = eligible.reduce((sum, prize) => sum + prize.pesos_nivel[selectedLevel], 0);
    return new Map(eligible.map((prize) => [prize.id, total ? Math.round(prize.pesos_nivel[selectedLevel] / total * 100) : 0]));
  }, [prizes, selectedLevel]);

  function update(id: number, patch: Partial<Prize>) { setPrizes((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  async function save(prize: Prize) {
    setSaving(prize.id); setNotice("");
    try {
      const response = await fetchAdmin("/api/admin/premios", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prize.id, canal_uso: prize.canal_uso, custo_estimado: Number(prize.custo_estimado), expira_em_dias: Number(prize.expira_em_dias), pesos_nivel: prize.pesos_nivel, descricao_operacional: prize.descricao_operacional || null }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Não foi possível salvar.");
      await load(); setNotice(`“${prize.nome}” foi salvo.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(null); }
  }

  return <main className={styles.page}>
    <div className={styles.top}><span className={styles.kicker}>CLUBE CUPIM / CONFIGURAÇÃO</span><h1>A Roleta do Rei</h1><p>Prêmios, custos e chances em um só lugar. O sorteio sempre usa a configuração salva no servidor.</p></div>
    <section className={styles.status}><span className={styles.statusDot} /><div><strong>{config?.v2_modo_teste ? "PILOTO EM MODO DE TESTE" : config?.v2_publicada ? "ROLETA PUBLICADA" : "ROLETA NÃO PUBLICADA"}</strong><p>{config?.v2_modo_teste ? "Somente o prêmio interno, sem valor comercial, pode entrar nos giros. Os demais continuam como rascunho." : "Confira cuidadosamente os prêmios ativos e suas chances antes de operar."}</p></div></section>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.metrics}><article><span>PRÊMIO DE TESTE</span><strong>{pilot.filter((item) => item.ativo).length}</strong><small>ativo no piloto</small></article><article><span>CATÁLOGO COMERCIAL</span><strong>{drafts.length}</strong><small>rascunhos para revisar</small></article><article><span>FAIXAS DA CONTA</span><strong>06</strong><small>pesos independentes</small></article></div>
    <div className={styles.toolbar}><div className={styles.tabs}><button type="button" className={view === "pilot" ? styles.activeTab : ""} onClick={() => setView("pilot")}>Em teste <span>{pilot.length}</span></button><button type="button" className={view === "drafts" ? styles.activeTab : ""} onClick={() => setView("drafts")}>Rascunhos <span>{drafts.length}</span></button></div><label>Simular chances na faixa <select value={selectedLevel} onChange={(event) => setSelectedLevel(Number(event.target.value))}>{levels.map((level, index) => <option key={level} value={index}>{level}</option>)}</select></label></div>
    {view === "drafts" && <p className={styles.guidance}>Estes são os tipos de prêmio antigos preservados para revisão. Alterar custo, validade ou pesos não os ativa. A publicação comercial dependerá de sua aprovação e de regras finais para descontos, frete e resgate.</p>}
    <section className={styles.cards}>{shown.map((prize) => <article className={styles.card} key={prize.id}>
      <div className={styles.cardTop}><span className={styles.emoji}>{prize.emoji}</span><div><span className={prize.ativo ? styles.activeBadge : styles.draftBadge}>{prize.ativo ? "ATIVO NO PILOTO" : "RASCUNHO"}</span><h2>{prize.nome}</h2><p>{prize.descricao_vitoria}</p></div><strong className={styles.chance}>{odds.has(prize.id) ? `${odds.get(prize.id)}%` : "—"}<small>CHANCE ATUAL</small></strong></div>
      <div className={styles.fields}><label>Uso no atendimento<input disabled={!canChange} maxLength={1000} value={prize.descricao_operacional || ""} onChange={(event) => update(prize.id, { descricao_operacional: event.target.value })} /></label><label>Canal<select disabled={!canChange} value={prize.canal_uso} onChange={(event) => update(prize.id, { canal_uso: event.target.value as Prize["canal_uso"] })}><option value="ambos">Salão e delivery</option><option value="presencial">Somente salão</option><option value="delivery">Somente delivery</option></select></label><label>Custo estimado (R$)<input disabled={!canChange} type="number" min="0" step="0.01" value={prize.custo_estimado} onChange={(event) => update(prize.id, { custo_estimado: Number(event.target.value) })} /></label><label>Validade (dias)<input disabled={!canChange} type="number" min="1" max="90" value={prize.expira_em_dias} onChange={(event) => update(prize.id, { expira_em_dias: Number(event.target.value) })} /></label></div>
      <details className={styles.weights}><summary>Pesos por faixa da conta <span>▾</span></summary><div>{levels.map((level, index) => <label key={level}>{level}<input disabled={!canChange} type="number" min="0" max="100000" value={prize.pesos_nivel[index]} onChange={(event) => { const next = [...prize.pesos_nivel]; next[index] = Number(event.target.value); update(prize.id, { pesos_nivel: next }); }} /></label>)}</div><p>Peso não é porcentagem: a chance depende da soma dos pesos de todos os prêmios ativos na faixa.</p></details>
      <div className={styles.cardFoot}><span>{prize.ativo ? "Aparece na roleta enquanto elegível" : "Não aparece na roleta"}</span>{canChange && <button type="button" disabled={saving !== null} onClick={() => save(prize)}>{saving === prize.id ? "Salvando…" : "Salvar alterações"}</button>}</div>
    </article>)}</section>
    {!canChange && <p className={styles.guidance}>Seu acesso é somente de consulta. A edição é restrita ao superadministrador.</p>}
  </main>;
}
