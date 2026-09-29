'use client';

import confetti from 'canvas-confetti';
import Image from 'next/image';
import { FormEvent, useEffect, useRef, useState } from 'react';
import styles from '@/app/roleta/v2/roleta.module.css';
import { prizePhoto } from '@/lib/prizeVisuals';
import PrizeWheel, { type WheelPrize } from './PrizeWheel';

export type SpinResult = {
  premio: WheelPrize & { descricao_vitoria: string };
  cupom: string;
  expira_em: string;
  modo_teste: boolean;
};

type Props = {
  prizes: WheelPrize[];
  /** Registra o giro no servidor (ou simula, na demonstração) e devolve o prêmio sorteado. */
  requestSpin: (phone: string, marketing: boolean) => Promise<SpinResult>;
  demo?: boolean;
};

const BRAND_COLORS = ['#dc251b', '#f2bb5f', '#fff1cb', '#ff7a1a', '#ffd784'];

function celebrate() {
  const base = { colors: BRAND_COLORS, disableForReducedMotion: true, zIndex: 60 };
  confetti({ ...base, particleCount: 170, spread: 110, startVelocity: 58, origin: { y: 0.42 }, scalar: 1.15 });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 90, angle: 60, spread: 70, startVelocity: 65, origin: { x: 0, y: 0.75 } });
    confetti({ ...base, particleCount: 90, angle: 120, spread: 70, startVelocity: 65, origin: { x: 1, y: 0.75 } });
  }, 260);
  window.setTimeout(() => confetti({ ...base, particleCount: 60, spread: 160, startVelocity: 30, origin: { y: 0.3 }, shapes: ['star'] }), 700);
  if ('vibrate' in navigator) navigator.vibrate?.([40, 60, 120]);
}

export default function RoletaExperience({ prizes, requestSpin, demo = false }: Props) {
  const sectors = Array.from({ length: 6 }, (_, index) => prizes[index % prizes.length]);
  const [step, setStep] = useState<'form' | 'wheel' | 'result'>('form');
  const [phone, setPhone] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<SpinResult | null>(null);
  const [flash, setFlash] = useState(false);
  const pending = useRef<SpinResult | null>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = privacyDialog.current;
    if (!dialog) return;
    if (privacyOpen && !dialog.open) dialog.showModal();
    if (!privacyOpen && dialog.open) dialog.close();
  }, [privacyOpen]);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) { setNotice('Informe seu WhatsApp com DDD.'); return; }
    setNotice('');
    setStep('wheel');
  }

  async function onSpinStart() {
    setNotice('');
    const winning = await requestSpin(phone, marketing);
    pending.current = winning;
    const matches = sectors.flatMap((prize, index) => (prize.nome === winning.premio.nome ? [index] : []));
    return matches.length ? matches[Math.floor(Math.random() * matches.length)] : 0;
  }

  function onFinished() {
    const winning = pending.current;
    if (!winning) return;
    setFlash(true);
    celebrate();
    window.setTimeout(() => { setResult(winning); setStep('result'); setFlash(false); }, 650);
  }

  const resultPhoto = result && !result.modo_teste ? prizePhoto(result.premio.nome, result.premio.imagem_url) : null;

  return <main className={styles.page}><div className={styles.shell}>
    {flash && <div className={styles.flash} aria-hidden="true" />}
    <header className={styles.header}><Image src="/logo.png" alt="" width={36} height={36} /><span>O REI DO CUPIM <small>CLUBE CUPIM</small></span></header>
    {demo && <p className={styles.demoBanner}>DEMONSTRAÇÃO · prêmios fictícios, nada é registrado</p>}

    {step !== 'result' && <section className={styles.hero}>
      <p className={styles.eyebrow}>A ROLETA DO REI</p>
      <h1>{step === 'form' ? <>Libere <em>seu giro.</em></> : <>É sua vez <em>de girar.</em></>}</h1>
    </section>}

    {notice && <p className={styles.error} role="alert">{notice}</p>}

    {step !== 'result' && <div className={styles.game}>
      <PrizeWheel prizes={sectors} locked={step === 'form'} onSpinStart={onSpinStart} onFinished={onFinished} onError={setNotice} />
      {step === 'form' && <form className={styles.form} onSubmit={unlock}>
        <label className={styles.phoneLabel}>Seu WhatsApp<input required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" /></label>
        <div className={styles.consentRow}><label className={styles.optIn}><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Receber ofertas no WhatsApp</span></label><button type="button" className={styles.learnMore} onClick={() => setPrivacyOpen(true)}>Saiba mais</button></div>
        <button className={styles.spinButton} type="submit">LIBERAR ROLETA<span aria-hidden="true">🔥</span></button>
        <small className={styles.privacy}>Um giro por QR. Ofertas são opcionais.</small>
      </form>}
    </div>}

    {step === 'result' && result && <section className={styles.result} aria-live="polite">
      <div className={styles.reveal}>
        {result.modo_teste ? <Image className={styles.resultLogo} src="/logo.png" alt="" width={96} height={96} />
          : resultPhoto ? <Image className={styles.resultPhoto} src={resultPhoto} alt={result.premio.nome} width={220} height={220} />
          : <span className={styles.resultEmoji} aria-hidden="true">{result.premio.emoji}</span>}
      </div>
      <p className={styles.eyebrow}>{result.modo_teste ? 'SIMULAÇÃO CONCLUÍDA' : 'VOCÊ GANHOU'}</p>
      <h2>{result.premio.nome}</h2>
      {result.modo_teste ? <p className={styles.testWarning}>Teste do Clube — sem benefício para resgatar.</p> : <>
        <p>{result.premio.descricao_vitoria}</p>
        <div className={styles.coupon}><span>MOSTRE ESTE CÓDIGO À EQUIPE</span><strong>{result.cupom}</strong><small>Válido até {new Date(result.expira_em).toLocaleDateString('pt-BR')}.</small></div>
      </>}
    </section>}

    <dialog ref={privacyDialog} className={styles.privacyDialog} aria-labelledby="privacy-title" onClose={() => setPrivacyOpen(false)}><div className={styles.dialogInner}><button type="button" className={styles.closeDialog} aria-label="Fechar" onClick={() => setPrivacyOpen(false)}>×</button><p className={styles.eyebrow}>JOGUE COM TRANQUILIDADE</p><h2 id="privacy-title">Seu giro, suas escolhas</h2><p>Seu WhatsApp vincula o resultado a este QR. Cada QR dá direito a um giro.</p><p>Receber ofertas é opcional: só enviaremos promoções se você marcar a opção. Você poderá cancelar quando quiser.</p><a href="/privacidade" target="_blank" rel="noopener noreferrer">Ler o aviso de privacidade completo ↗</a><button type="button" className={styles.dialogButton} onClick={() => setPrivacyOpen(false)}>Entendi</button></div></dialog>
  </div></main>;
}
