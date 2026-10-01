"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdmin } from "@/lib/adminFetch";
import { prizePhoto } from "@/lib/prizeVisuals";
import { useAdminCanChange } from "../adminAccessContext";
import RoletaPreview from "./RoletaPreview";
import styles from "./roleta-admin.module.css";

type Prize = {
  id: number; codigo: string; nome: string; emoji: string; descricao_vitoria: string | null;
  descricao_operacional: string | null; ativo: boolean; participa_roleta: boolean;
  canal_uso: "presencial" | "delivery" | "ambos";
  custo_estimado: number; expira_em_dias: number; pesos_nivel: number[]; imagem_url: string | null; tipo: string | null;
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
    imagem_url: raw.imagem_url || null, tipo: raw.tipo || null,
  };
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Foto do prêmio. Envia uma vez por clique; erro ou demora nunca reenvia sozinho. */
function PrizePhoto({ prize, canChange, onDone }: { prize: Prize; canChange: boolean; onDone: (message: string) => Promise<void> }) {
  const current = prizePhoto(prize);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(selected: File | undefined) {
    setError("");
    if (!selected) return;
    if (!PHOTO_TYPES.includes(selected.type)) { setError("Use uma foto JPG, PNG ou WebP."); return; }
    if (selected.size > MAX_PHOTO_BYTES) { setError("A foto passa de 2 MB. Escolha uma menor."); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function cancel() { setFile(null); setPreview(null); setError(""); }

  async function send() {
    if (!file || sending) return;
    setSending(true); setError("");
    const body = new FormData();
    body.append("foto", file);
    try {
      // Sem Content-Type manual: o navegador monta o multipart com o boundary.
      const response = await fetchAdmin(`/api/admin/premios/${prize.id}/imagem`, { method: "POST", body, signal: AbortSignal.timeout(45_000) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        setError(json?.error || "Não foi possível trocar a foto.");
        await onDone("");
        return;
      }
      cancel();
      await onDone(`Foto de “${prize.nome}” atualizada.`);
    } catch {
      setError("Não foi possível confirmar a troca. O painel foi atualizado: confira a foto abaixo antes de tentar de novo.");
      await onDone("");
    } finally { setSending(false); }
  }

  return <div className={styles.photoBox}>
    <div className={styles.photoFrame}>
      {preview ? <img src={preview} alt="Prévia da nova foto" /> /* eslint-disable-line @next/next/no-img-element -- prévia local (blob) */
        : current ? <img src={current} alt={`Foto atual de ${prize.nome}`} /> /* eslint-disable-line @next/next/no-img-element -- URL do Storage ou arquivo local */
        : <span className={styles.photoEmpty}>{prize.emoji}<small>Sem foto</small></span>}
      {preview && <em>Prévia</em>}
    </div>
    <div className={styles.photoActions}>
      <strong>Foto exibida ao cliente</strong>
      <small>{prize.imagem_url ? "Enviada pelo painel." : current ? "Foto padrão do site." : "Sem foto: o cliente vê o ícone."}</small>
      {canChange && !file && <label className={styles.photoPick}>Trocar foto<input type="file" accept={PHOTO_TYPES.join(",")} disabled={sending} onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} /></label>}
      {canChange && file && <div className={styles.photoConfirm}>
        <button type="button" disabled={sending} onClick={send}>{sending ? "Enviando…" : "Usar esta foto"}</button>
        <button type="button" className={styles.photoCancel} disabled={sending} onClick={cancel}>Cancelar</button>
      </div>}
      {canChange && <small>JPG, PNG ou WebP até 2 MB. Prefira foto quadrada, com o produto no centro.</small>}
      {error && <small className={styles.photoError} role="alert">{error}</small>}
    </div>
  </div>;
}

export default function AdminRoletaV2() {
  const canChange = useAdminCanChange();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [config, setConfig] = useState<Config>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [view, setView] = useState<"pilot" | "drafts">("pilot");
  const [previewOpen, setPreviewOpen] = useState(false);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

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

  // Depois de qualquer envio (certo, errado ou incerto) relê o servidor para mostrar o estado real.
  async function refreshAfterPhoto(message: string) {
    try { await load(); if (message) setNotice(message); }
    catch { setNotice("Não foi possível atualizar o painel. Recarregue a página para conferir a foto."); }
  }

  function update(id: number, patch: Partial<Prize>) { setPrizes((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  // Um clique = um envio. Em erro ou demora relê o servidor para mostrar o que ficou salvo; nunca repete sozinho.
  async function save(prize: Prize) {
    const nome = prize.nome.trim();
    if (!nome) { setNotice("O nome do prêmio não pode ficar vazio."); return; }
    setSaving(prize.id); setNotice("");
    try {
      const response = await fetchAdmin("/api/admin/premios", {
        method: "PUT", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ id: prize.id, nome, descricao_vitoria: prize.descricao_vitoria?.trim() || null, canal_uso: prize.canal_uso, custo_estimado: Number(prize.custo_estimado), expira_em_dias: Number(prize.expira_em_dias), pesos_nivel: prize.pesos_nivel, descricao_operacional: prize.descricao_operacional || null }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Não foi possível salvar.");
      await load(); setNotice(`“${nome}” foi salvo.`);
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      const message = timedOut ? "Não foi possível confirmar se salvou." : error instanceof Error ? error.message : "Não foi possível salvar.";
      try { await load(); setNotice(`${message} O painel foi atualizado: confira os dados antes de tentar de novo.`); }
      catch { setNotice(`${message} Recarregue a página para conferir.`); }
    }
    finally { setSaving(null); }
  }

  return <main className={styles.page}>
    <div className={styles.top}><span className={styles.kicker}>CLUBE CUPIM / CONFIGURAÇÃO</span><h1>A Roleta do Rei</h1><p>Prêmios, custos e chances em um só lugar. O sorteio sempre usa a configuração salva no servidor.</p></div>
    <section className={styles.status}><span className={styles.statusDot} /><div><strong>{config?.v2_modo_teste ? "PILOTO EM MODO DE TESTE" : config?.v2_publicada ? "ROLETA PUBLICADA" : "ROLETA NÃO PUBLICADA"}</strong><p>{config?.v2_modo_teste ? "Somente o prêmio interno, sem valor comercial, pode entrar nos giros. Os demais continuam como rascunho." : "Confira cuidadosamente os prêmios ativos e suas chances antes de operar."}</p></div></section>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.metrics}><article><span>PRÊMIO DE TESTE</span><strong>{pilot.filter((item) => item.ativo).length}</strong><small>ativo no piloto</small></article><article><span>CATÁLOGO COMERCIAL</span><strong>{drafts.length}</strong><small>rascunhos para revisar</small></article><article><span>FAIXAS DA CONTA</span><strong>06</strong><small>pesos independentes</small></article></div>
    <div className={styles.toolbar}><div className={styles.tabs}><button type="button" className={view === "pilot" ? styles.activeTab : ""} onClick={() => setView("pilot")}>Em teste <span>{pilot.length}</span></button><button type="button" className={view === "drafts" ? styles.activeTab : ""} onClick={() => setView("drafts")}>Rascunhos <span>{drafts.length}</span></button></div><label>Simular chances na faixa <select value={selectedLevel} onChange={(event) => setSelectedLevel(Number(event.target.value))}>{levels.map((level, index) => <option key={level} value={index}>{level}</option>)}</select></label><button type="button" className={styles.previewButton} disabled={!prizes.length} onClick={() => setPreviewOpen(true)}>Ver prévia da roleta</button></div>
    {view === "drafts" && <p className={styles.guidance}>Estes são os tipos de prêmio antigos preservados para revisão. Alterar custo, validade ou pesos não os ativa. A publicação comercial dependerá de sua aprovação e de regras finais para descontos, frete e resgate.</p>}
    <section className={styles.cards}>{shown.map((prize) => <article className={styles.card} key={prize.id}>
      <div className={styles.cardTop}><span className={styles.emoji}>{prize.emoji}</span><div><span className={prize.ativo ? styles.activeBadge : styles.draftBadge}>{prize.ativo ? "ATIVO NO PILOTO" : "RASCUNHO"}</span><h2>{prize.nome}</h2><p>{prize.descricao_vitoria}</p></div><strong className={styles.chance}>{odds.has(prize.id) ? `${odds.get(prize.id)}%` : "—"}<small>CHANCE ATUAL</small></strong></div>
      <PrizePhoto prize={prize} canChange={canChange} onDone={refreshAfterPhoto} />
      <div className={styles.textFields}>
        <label>Nome do prêmio<input disabled={!canChange} required maxLength={255} value={prize.nome} onChange={(event) => update(prize.id, { nome: event.target.value })} /></label>
        <label>Mensagem de vitória <small>(o cliente lê ao ganhar)</small><textarea disabled={!canChange} maxLength={500} rows={2} value={prize.descricao_vitoria || ""} onChange={(event) => update(prize.id, { descricao_vitoria: event.target.value })} /><small>{(prize.descricao_vitoria || "").length}/500</small></label>
      </div>
      <div className={styles.fields}><label>Uso no atendimento<input disabled={!canChange} maxLength={1000} value={prize.descricao_operacional || ""} onChange={(event) => update(prize.id, { descricao_operacional: event.target.value })} /></label><label>Canal<select disabled={!canChange} value={prize.canal_uso} onChange={(event) => update(prize.id, { canal_uso: event.target.value as Prize["canal_uso"] })}><option value="ambos">Salão e delivery</option><option value="presencial">Somente salão</option><option value="delivery">Somente delivery</option></select></label><label>Custo estimado (R$)<input disabled={!canChange} type="number" min="0" step="0.01" value={prize.custo_estimado} onChange={(event) => update(prize.id, { custo_estimado: Number(event.target.value) })} /></label><label>Validade (dias)<input disabled={!canChange} type="number" min="1" max="90" value={prize.expira_em_dias} onChange={(event) => update(prize.id, { expira_em_dias: Number(event.target.value) })} /></label></div>
      <details className={styles.weights}><summary>Pesos por faixa da conta <span>▾</span></summary><div>{levels.map((level, index) => <label key={level}>{level}<input disabled={!canChange} type="number" min="0" max="100000" value={prize.pesos_nivel[index]} onChange={(event) => { const next = [...prize.pesos_nivel]; next[index] = Number(event.target.value); update(prize.id, { pesos_nivel: next }); }} /></label>)}</div><p>Peso não é porcentagem: a chance depende da soma dos pesos de todos os prêmios ativos na faixa.</p></details>
      <div className={styles.cardFoot}><span>{prize.ativo ? "Aparece na roleta enquanto elegível" : "Não aparece na roleta"}</span>{canChange && <button type="button" disabled={saving !== null} onClick={() => save(prize)}>{saving === prize.id ? "Salvando…" : "Salvar alterações"}</button>}</div>
    </article>)}</section>
    {!canChange && <p className={styles.guidance}>Seu acesso é somente de consulta. A edição é restrita ao superadministrador.</p>}
    {previewOpen && <RoletaPreview prizes={prizes} level={selectedLevel} levelLabel={levels[selectedLevel]} testMode={Boolean(config?.v2_modo_teste)} onClose={closePreview} />}
  </main>;
}
