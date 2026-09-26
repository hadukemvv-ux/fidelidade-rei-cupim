"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import styles from "./roleta.module.css";
import { rotationForSector } from "@/lib/wheelLanding";

type Prize = { nome: string; emoji: string };
type Session = { nivel: number; expira_em: string; premios: Prize[] };
type Result = { premio: Prize & { descricao_vitoria: string }; cupom: string; expira_em: string; modo_teste: boolean };
function Wheel({ prizes, rotation, spinning }: { prizes: Prize[]; rotation: number; spinning: boolean }) {
  const sectors = Array.from({ length: 6 }, (_, index) => prizes[index % prizes.length]);
  const repeatedPrize = new Set(sectors.map((prize) => prize.nome)).size === 1;
  return <div className={styles.wheelStage} role="img" aria-label={spinning ? "Roleta girando" : "Roleta de prêmios do Clube Cupim"}>
    <span className={styles.pointer} aria-hidden="true" />
    <div className={styles.wheel} style={{ transform: `rotate(${rotation}deg)` }}>
      {sectors.map((prize, index) => {
        const angle = index * 60 + 30;
        return <span className={styles.sectorLabel} key={index} style={{ transform: `rotate(${angle}deg) translateY(calc(var(--wheel-size) * -0.34)) rotate(${-angle}deg)` }}>{repeatedPrize ? <Image src="/logo.png" alt="" width={32} height={32} /> : <><span>{prize.emoji}</span><small>{prize.nome}</small></>}</span>;
      })}
      <span className={styles.hub} aria-hidden="true"><Image src="/logo.png" alt="" width={64} height={64} /></span>
    </div>
  </div>;
}

function RoletaContent() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState("Preparando sua chance...");
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const dialog = privacyDialog.current;
    if (!dialog) return;
    if (privacyOpen && !dialog.open) dialog.showModal();
    if (!privacyOpen && dialog.open) dialog.close();
  }, [privacyOpen]);

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
    <header className={styles.header}><Image src="/logo.png" alt="" width={42} height={42} /><span>O REI DO CUPIM <small>CLUBE CUPIM</small></span></header>
    <section className={styles.hero}><p className={styles.eyebrow}>A ROLETA DO REI</p><h1>{result ? <>Giro <em>concluído.</em></> : <>É sua vez <em>de girar.</em></>}</h1></section>
    {loading && <p className={styles.message}>{notice}</p>}
    {!loading && notice && <p className={styles.error} role="alert">{notice}</p>}
    {!loading && session && !result && <div className={styles.game}><Wheel prizes={session.premios} rotation={rotation} spinning={spinning} /><form className={styles.form} onSubmit={spin}>
      <h2>Vamos lá?</h2>
      <label className={styles.phoneLabel}>Seu WhatsApp<input required disabled={spinning} inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" /></label>
      <div className={styles.consentRow}><label className={styles.optIn}><input disabled={spinning} type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Receber ofertas no WhatsApp</span></label><button type="button" className={styles.learnMore} onClick={() => setPrivacyOpen(true)}>Saiba mais</button></div>
      <button className={styles.spinButton} disabled={spinning} type="submit">{spinning ? "GIRANDO…" : "GIRAR AGORA"}<span aria-hidden="true">↗</span></button>
      <small className={styles.privacy}>Um giro por QR. Ofertas são opcionais.</small>
    </form></div>}
    {result && <section className={styles.result} aria-live="polite">{result.modo_teste ? <Image className={styles.resultLogo} src="/logo.png" alt="" width={76} height={76} /> : <span className={styles.resultEmoji} aria-hidden="true">{result.premio.emoji}</span>}<p className={styles.eyebrow}>{result.modo_teste ? "SIMULAÇÃO CONCLUÍDA" : "VOCÊ GANHOU"}</p><h2>{result.premio.nome}</h2>{result.modo_teste ? <p className={styles.testWarning}>Teste do Clube — sem benefício para resgatar.</p> : <><p>{result.premio.descricao_vitoria}</p><div className={styles.coupon}><span>SEU CÓDIGO</span><strong>{result.cupom}</strong><small>Válido até {new Date(result.expira_em).toLocaleDateString("pt-BR")}.</small></div></>}</section>}
    <dialog ref={privacyDialog} className={styles.privacyDialog} aria-labelledby="privacy-title" onClose={() => setPrivacyOpen(false)}><div className={styles.dialogInner}><button type="button" className={styles.closeDialog} aria-label="Fechar" onClick={() => setPrivacyOpen(false)}>×</button><p className={styles.eyebrow}>JOGUE COM TRANQUILIDADE</p><h2 id="privacy-title">Seu giro, suas escolhas</h2><p>Seu WhatsApp vincula o resultado a este QR. Cada QR dá direito a um giro.</p><p>Receber ofertas é opcional: só enviaremos promoções se você marcar a opção. Você poderá cancelar quando quiser.</p><a href="/privacidade" target="_blank" rel="noopener noreferrer">Ler o aviso de privacidade completo ↗</a><button type="button" className={styles.dialogButton} onClick={() => setPrivacyOpen(false)}>Entendi</button></div></dialog>
  </div></main>;
}

export default function RoletaV2Page() { return <Suspense fallback={<main className={styles.page}>Preparando a roleta...</main>}><RoletaContent /></Suspense>; }
