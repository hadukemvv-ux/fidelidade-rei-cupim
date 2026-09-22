"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./roleta.module.css";
import { rotationForSector } from "@/lib/wheelLanding";

type Prize = { nome: string; emoji: string };
type Session = { nivel: number; expira_em: string; premios: Prize[] };
type Result = { premio: Prize & { descricao_vitoria: string }; cupom: string; expira_em: string; modo_teste: boolean };
const levels = ["", "Até R$ 100", "R$ 100 a R$ 200", "R$ 200 a R$ 300", "R$ 300 a R$ 400", "R$ 400 a R$ 500", "Acima de R$ 500"];

function Wheel({ prizes, rotation, spinning }: { prizes: Prize[]; rotation: number; spinning: boolean }) {
  const sectors = Array.from({ length: 6 }, (_, index) => prizes[index % prizes.length]);
  return <div className={styles.wheelStage} role="img" aria-label={spinning ? "Roleta girando" : "Roleta de prêmios do Clube Cupim"}>
    <span className={styles.pointer} aria-hidden="true" />
    <div className={styles.wheel} style={{ transform: `rotate(${rotation}deg)` }}>
      {sectors.map((prize, index) => {
        const angle = index * 60 + 30;
        return <span className={styles.sectorLabel} key={index} style={{ transform: `rotate(${angle}deg) translateY(calc(var(--wheel-size) * -0.34)) rotate(${-angle}deg)` }}><span>{prize.emoji}</span><small>{prize.nome}</small></span>;
      })}
      <span className={styles.hub} aria-hidden="true">O REI<br />DO CUPIM</span>
    </div>
  </div>;
}

function RoletaContent() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState("Preparando sua chance...");
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!token) { setNotice("Este QR é inválido. Peça ajuda à equipe."); setLoading(false); return; }
    fetch(`/api/roleta-v2/sessao?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível abrir a roleta."); setSession(data as Session); setNotice(""); })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Não foi possível abrir a roleta."))
      .finally(() => setLoading(false));
  }, [token]);

  async function spin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || spinning) return;
    setSpinning(true); setNotice("");
    try {
      const response = await fetch("/api/roleta-v2/girar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, telefone: phone, receber_marketing: marketing, consentimento_versao: "marketing-roleta-v1" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir o giro.");
      const winning = data as Result;
      const sectors = Array.from({ length: 6 }, (_, index) => session.premios[index % session.premios.length]);
      const landingIndex = sectors.findIndex((prize) => prize.nome === winning.premio.nome);
      if (landingIndex >= 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setRotation((current) => rotationForSector(current, landingIndex));
        await new Promise((resolve) => window.setTimeout(resolve, 3800));
      }
      setResult(winning);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível concluir o giro."); }
    finally { setSpinning(false); }
  }

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><span className={styles.brandMark}>♛</span><span>O REI DO CUPIM <small>CLUBE CUPIM</small></span><span className={styles.headerBadge}>A ROLETA DO REI</span></header>
    <section className={styles.hero}><p className={styles.eyebrow}>SUA CONTA VIROU UMA CHANCE</p><h1>Hoje a sorte <em>é sua.</em></h1><p>Um giro, um resultado. Descubra o que o Rei reservou para você.</p>{session && <div className={styles.band}><span>FAIXA DA CONTA</span><strong>{levels[session.nivel] || "Clube Cupim"}</strong></div>}</section>
    {loading && <p className={styles.message}>{notice}</p>}
    {!loading && notice && <p className={styles.error} role="alert">{notice}</p>}
    {!loading && session && !result && <div className={styles.game}><Wheel prizes={session.premios} rotation={rotation} spinning={spinning} /><form className={styles.form} onSubmit={spin}>
      <span className={styles.step}>01 / PARTICIPE</span><h2>Pronto para girar?</h2><p>Informe seu WhatsApp para vincular o resultado ao seu QR. Cada QR permite apenas um giro.</p>
      <label className={styles.phoneLabel}>Seu WhatsApp<input required disabled={spinning} inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" /></label>
      <label className={styles.optIn}><input disabled={spinning} type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quero receber novidades e ofertas pelo WhatsApp. Opcional, com cancelamento a qualquer momento.</span></label>
      <button className={styles.spinButton} disabled={spinning} type="submit">{spinning ? "PREPARANDO RESULTADO…" : "GIRAR A ROLETA"}<span aria-hidden="true">↗</span></button>
      <small className={styles.privacy}>Seu telefone ajuda a proteger o giro único. <a href="/privacidade">Veja nossa política de privacidade</a>.</small>
    </form></div>}
    {result && <section className={styles.result} aria-live="polite"><span className={styles.resultEmoji} aria-hidden="true">{result.premio.emoji}</span><p className={styles.eyebrow}>RESULTADO CONFIRMADO</p><h2>{result.premio.nome}</h2><p>{result.premio.descricao_vitoria}</p><div className={styles.coupon}><span>CÓDIGO DO BENEFÍCIO</span><strong>{result.cupom}</strong><small>Apresente no atendimento até {new Date(result.expira_em).toLocaleDateString("pt-BR")}.</small></div>{result.modo_teste && <p className={styles.testWarning}>Este é um teste sem valor comercial. O benefício não pode ser utilizado em compras.</p>}</section>}
    <footer className={styles.footer}>CHURRASCO • EXPERIÊNCIA • SORTE <span>FORTALEZA, CE</span></footer>
  </div></main>;
}

export default function RoletaV2Page() { return <Suspense fallback={<main className={styles.page}>Preparando a roleta...</main>}><RoletaContent /></Suspense>; }
