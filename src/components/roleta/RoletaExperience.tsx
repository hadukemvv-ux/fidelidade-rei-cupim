'use client';

import confetti from 'canvas-confetti';
import Image from 'next/image';
import { FormEvent, useEffect, useRef, useState } from 'react';
import styles from '@/app/roleta/v2/roleta.module.css';
import { prizeNotes, prizePhoto, ROLETA_BACKDROP } from '@/lib/prizeVisuals';
import { bodyFont, displayFont } from '@/components/brandFonts';
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
  /** Etiqueta no topo quando não é giro de verdade (demonstração ou prévia do painel). */
  demo?: boolean | string;
};

const EMBER_COLORS = ['#ff6a00', '#ff8c1a', '#ffb347', '#ffd27a', '#dc251b'];

/** Faíscas de brasa: explodem do centro da roda e sobem, em vez de confete colorido. */
function celebrate() {
  const base = { colors: EMBER_COLORS, shapes: ['circle' as const], disableForReducedMotion: true, zIndex: 300 };
  confetti({ ...base, particleCount: 140, spread: 360, startVelocity: 32, gravity: 0.35, decay: 0.92, scalar: 0.55, ticks: 160, origin: { y: 0.5 } });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 90, angle: 90, spread: 55, startVelocity: 55, gravity: 0.5, scalar: 0.45, ticks: 220, origin: { x: 0.3, y: 1 } });
    confetti({ ...base, particleCount: 90, angle: 90, spread: 55, startVelocity: 55, gravity: 0.5, scalar: 0.45, ticks: 220, origin: { x: 0.7, y: 1 } });
  }, 220);
  if ('vibrate' in navigator) navigator.vibrate?.([40, 60, 120]);
}

export default function RoletaExperience({ prizes, requestSpin, demo = false }: Props) {
  // Se o servidor sortear um prêmio que não estava desenhado (lista mudou após abrir a
  // página), uma fatia é trocada por ele durante o giro rápido para a roda não mentir.
  const [override, setOverride] = useState<{ index: number; prize: WheelPrize } | null>(null);
  const sectors = Array.from({ length: 6 }, (_, index) => (override?.index === index ? override.prize : prizes[index % prizes.length]));
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
    // Pelo ID quando a API envia (nome é editável e pode repetir); pelo nome só como reserva.
    const sameId = winning.premio.id != null;
    const matches = sectors.flatMap((prize, index) => (
      (sameId ? prize.id === winning.premio.id : prize.nome === winning.premio.nome) ? [index] : []
    ));
    if (matches.length) return matches[Math.floor(Math.random() * matches.length)];
    const index = Math.floor(Math.random() * sectors.length);
    setOverride({ index, prize: winning.premio });
    return index;
  }

  function onFinished() {
    const winning = pending.current;
    if (!winning) return;
    setFlash(true);
    celebrate();
    window.setTimeout(() => { setResult(winning); setStep('result'); setFlash(false); }, 650);
  }

  const resultPhoto = result && !result.modo_teste ? prizePhoto(result.premio) : null;

  return <main className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
    <div className={styles.backdrop} aria-hidden="true"><Image src={ROLETA_BACKDROP.src} alt="" fill priority sizes="100vw" style={{ objectPosition: ROLETA_BACKDROP.position, transform: `scale(${ROLETA_BACKDROP.zoom})`, transformOrigin: ROLETA_BACKDROP.position }} /></div>
    <div className={styles.embers} aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
    {flash && <div className={styles.flash} aria-hidden="true" />}
    <div className={styles.shell}>
      <header className={styles.header}>
        <Image src="/logo.png" alt="" width={30} height={30} />
        <span>O Rei do Cupim</span>
        {demo && <em className={styles.demoPill} title="Nada é registrado.">{typeof demo === 'string' ? demo : 'Demonstração'}</em>}
      </header>

      {step !== 'result' && <section className={styles.hero}>
        <p className={styles.eyebrow}>Roleta do Rei</p>
        <h1>{step === 'form' ? 'Libere seu giro' : 'Sua vez de girar'}</h1>
      </section>}

      {notice && <p className={styles.error} role="alert">{notice}</p>}

      {step !== 'result' && <div className={styles.game}>
        <PrizeWheel prizes={sectors} locked={step === 'form'} onSpinStart={onSpinStart} onFinished={onFinished} onError={setNotice} />
        {step === 'form' && <form className={styles.form} onSubmit={unlock}>
          <label className={styles.phoneLabel}>Seu WhatsApp<input required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" /></label>
          <div className={styles.consentRow}><label className={styles.optIn}><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quero receber ofertas no WhatsApp</span></label><button type="button" className={styles.learnMore} onClick={() => setPrivacyOpen(true)}>Saiba mais</button></div>
          <button className={styles.spinButton} type="submit">Liberar roleta</button>
          <small className={styles.privacy}>Um giro por QR. Ofertas são opcionais.</small>
        </form>}
      </div>}

      {step === 'result' && result && <section className={styles.result} aria-live="polite">
        <div className={styles.reveal}>
          {resultPhoto ? <Image className={styles.resultPhoto} src={resultPhoto} alt={result.premio.nome} width={240} height={240} />
            : <span className={styles.resultMark}><Image src="/logo.png" alt="" width={84} height={84} /></span>}
        </div>
        <p className={styles.eyebrow}>{result.modo_teste ? 'Simulação concluída' : 'Você ganhou'}</p>
        <h2>{result.premio.nome}</h2>
        {result.modo_teste ? <p className={styles.testWarning}>Teste do Clube — sem benefício para resgatar.</p> : <>
          <p>{result.premio.descricao_vitoria}</p>
          {prizeNotes(result.premio).length > 0 && <ul className={styles.prizeNotes}>
            {prizeNotes(result.premio).map((note) => <li key={note}>{note}</li>)}
          </ul>}
          {resultPhoto && <small className={styles.photoNote}>Foto ilustrativa.</small>}
          <div className={styles.coupon}><span>Mostre este código à equipe</span><strong>{result.cupom}</strong><small>Válido até {new Date(result.expira_em).toLocaleDateString('pt-BR')}</small></div>
        </>}
      </section>}
    </div>

    <dialog ref={privacyDialog} className={styles.privacyDialog} aria-labelledby="privacy-title" onClose={() => setPrivacyOpen(false)}><div className={styles.dialogInner}><button type="button" className={styles.closeDialog} aria-label="Fechar" onClick={() => setPrivacyOpen(false)}>×</button><p className={styles.eyebrow}>Jogue com tranquilidade</p><h2 id="privacy-title">Seu giro, suas escolhas</h2><p>Seu WhatsApp vincula o resultado a este QR. Cada QR dá direito a um giro.</p><p>Receber ofertas é opcional: só enviaremos promoções se você marcar a opção. Você poderá cancelar quando quiser.</p><a href="/privacidade" target="_blank" rel="noopener noreferrer">Ler o aviso de privacidade completo ↗</a><button type="button" className={styles.dialogButton} onClick={() => setPrivacyOpen(false)}>Entendi</button></div></dialog>
  </main>;
}
