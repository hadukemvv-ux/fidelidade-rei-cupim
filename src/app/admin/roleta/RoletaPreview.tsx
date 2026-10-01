"use client";

import { useEffect, useState } from "react";
import RoletaExperience, { type SpinResult } from "@/components/roleta/RoletaExperience";
import styles from "./roleta-admin.module.css";

export type PreviewPrize = {
  id: number; tipo: string | null; nome: string; emoji: string; imagem_url: string | null;
  descricao_vitoria: string | null; ativo: boolean; participa_roleta: boolean; pesos_nivel: number[];
};

type Props = { prizes: PreviewPrize[]; level: number; levelLabel: string; testMode: boolean; onClose: () => void };

/**
 * A mesma tela do cliente, aberta dentro do painel. Nada vai ao servidor: sem sessão,
 * sem QR, sem cupom. O "sorteio" é feito aqui no navegador só para mostrar a animação.
 */
export default function RoletaPreview({ prizes, level, levelLabel, testMode, onClose }: Props) {
  const [mode, setMode] = useState<"now" | "catalog">("now");
  const [round, setRound] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  // "Agora": o que a roda do cliente mostra hoje nesta faixa (ativo, na roleta e com peso).
  // "Catálogo": todos os prêmios com peso, como se a roleta comercial estivesse ligada.
  const withWeight = prizes.filter((prize) => prize.pesos_nivel[level] > 0);
  const shown = mode === "now" ? withWeight.filter((prize) => prize.ativo && prize.participa_roleta) : withWeight;
  const showTestResult = mode === "now" && testMode;

  async function fakeSpin(): Promise<SpinResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const total = shown.reduce((sum, prize) => sum + prize.pesos_nivel[level], 0);
    let ticket = Math.random() * total;
    const won = shown.find((prize) => (ticket -= prize.pesos_nivel[level]) < 0) ?? shown[0];
    return {
      premio: { ...won, descricao_vitoria: won.descricao_vitoria || "" },
      cupom: "PREVIA-0000",
      expira_em: new Date(Date.now() + 14 * 86400000).toISOString(),
      modo_teste: showTestResult,
    };
  }

  return <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="Prévia da roleta">
    <div className={styles.previewBar}>
      <strong>PRÉVIA — não vale prêmio</strong>
      <div className={styles.previewModes}>
        <button type="button" className={mode === "now" ? styles.previewModeOn : ""} onClick={() => setMode("now")}>Como está agora</button>
        <button type="button" className={mode === "catalog" ? styles.previewModeOn : ""} onClick={() => setMode("catalog")}>Catálogo completo</button>
      </div>
      <button type="button" className={styles.previewAgain} onClick={() => setRound((value) => value + 1)}>Girar de novo</button>
      <button type="button" className={styles.previewClose} onClick={onClose}>Fechar ✕</button>
      <small>Faixa {levelLabel} · {mode === "now" ? (testMode ? "modo teste: só o ativo, resultado de simulação" : "prêmios ativos") : "todos com peso, inclusive rascunhos"} · inclui o que ainda não foi salvo · nada é registrado</small>
    </div>
    {shown.length
      ? <RoletaExperience key={`${mode}-${level}-${round}`} prizes={shown} requestSpin={fakeSpin} demo="Prévia" />
      : <p className={styles.previewEmpty}>Nenhum prêmio com peso nesta faixa{mode === "now" ? " entre os ativos" : ""}. O cliente veria: “Não há prêmio disponível para esta faixa”.</p>}
  </div>;
}
