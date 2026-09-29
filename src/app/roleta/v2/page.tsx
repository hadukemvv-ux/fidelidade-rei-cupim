"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RoletaExperience, { type SpinResult } from "@/components/roleta/RoletaExperience";
import type { WheelPrize } from "@/components/roleta/PrizeWheel";
import styles from "./roleta.module.css";

type Session = { nivel: number; expira_em: string; premios: WheelPrize[] };

function RoletaContent() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState(token ? "Preparando sua chance..." : "Este QR é inválido. Peça ajuda à equipe.");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    fetch(`/api/roleta-v2/sessao?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível abrir a roleta."); setSession(data as Session); setNotice(""); })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Não foi possível abrir a roleta."))
      .finally(() => setLoading(false));
  }, [token]);

  async function requestSpin(phone: string, marketing: boolean) {
    const response = await fetch("/api/roleta-v2/girar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, telefone: phone, receber_marketing: marketing, consentimento_versao: "marketing-roleta-v1" }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir o giro.");
    return data as SpinResult;
  }

  if (!session || !session.premios.length) {
    return <main className={styles.page}><div className={styles.shell}><p className={loading ? styles.message : styles.error} role={loading ? undefined : "alert"}>{notice || "Não foi possível abrir a roleta."}</p></div></main>;
  }
  return <RoletaExperience prizes={session.premios} requestSpin={requestSpin} />;
}

export default function RoletaV2Page() { return <Suspense fallback={<main className={styles.page}>Preparando a roleta...</main>}><RoletaContent /></Suspense>; }
