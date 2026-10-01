'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { prizePhoto, SHOW_PHOTOS_IN_WHEEL } from '@/lib/prizeVisuals';
import { normalizeAngle, planStop, releaseVelocity, rotationAt, sectorAtRotation, type AngleSample, type StopPlan } from '@/lib/wheelPhysics';
import styles from './PrizeWheel.module.css';

export type WheelPrize = { id?: number; tipo?: string | null; nome: string; emoji: string; imagem_url?: string | null };
type Phase = 'idle' | 'dragging' | 'spinning' | 'stopping' | 'done';

const SECTORS = 6;
const SECTOR_SIZE = 360 / SECTORS;
const MIN_FLICK = 280; // graus/s abaixo disso o puxão não conta
const MIN_SPIN = 560;
const MAX_SPIN = 1900;
const BUTTON_SPIN = 1100;
const AUTO_STOP_MS = 4000;

type Props = {
  prizes: WheelPrize[];
  locked?: boolean;
  /** Chamado uma vez quando o giro começa; resolve a fatia sorteada pelo servidor. */
  onSpinStart: () => Promise<number>;
  onFinished: (sector: number) => void;
  onError: (message: string) => void;
};

export default function PrizeWheel({ prizes, locked = false, onSpinStart, onFinished, onError }: Props) {
  const sectors = Array.from({ length: SECTORS }, (_, index) => prizes[index % prizes.length]);
  const allSame = new Set(sectors.map((prize) => prize.nome)).size === 1;

  const [phase, setPhaseState] = useState<Phase>('idle');
  const [hint, setHint] = useState('');
  const [muted, setMuted] = useState(false);
  const [stopPressed, setStopPressed] = useState(false);
  const phaseRef = useRef<Phase>('idle');
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLSpanElement>(null);
  const rotation = useRef(0);
  const velocity = useRef(0);
  const target = useRef<number | null>(null);
  const failure = useRef<string | null>(null);
  const stopRequested = useRef(false);
  const plan = useRef<StopPlan | null>(null);
  const planStartedAt = useRef(0);
  const spinStartedAt = useRef(0);
  const frame = useRef<number | null>(null);
  const lastPeg = useRef(0);
  const drag = useRef<{ centerX: number; centerY: number; lastAngle: number; samples: AngleSample[] } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);

  const setPhase = (next: Phase) => { phaseRef.current = next; setPhaseState(next); };

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  function tick() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(6);
    const context = audio.current;
    if (!context || mutedRef.current) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 1400;
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.03);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.035);
  }

  function paint() {
    const wheel = wheelRef.current;
    if (wheel) wheel.style.transform = `rotate(${rotation.current}deg)`;
    // O ponteiro "bate" em cada pino e volta, como numa roleta de verdade.
    const peg = Math.floor(rotation.current / SECTOR_SIZE);
    if (peg !== lastPeg.current) { lastPeg.current = peg; tick(); }
    const sinceBoundary = normalizeAngle(rotation.current) % SECTOR_SIZE;
    const moving = Math.sign(velocity.current || 1);
    const distance = moving > 0 ? sinceBoundary : SECTOR_SIZE - sinceBoundary;
    const bend = Math.max(0, 1 - distance / 14) * 22 * -moving;
    if (pointerRef.current) pointerRef.current.style.transform = `translateX(-50%) rotate(${bend}deg)`;
  }

  function finish() {
    frame.current = null;
    velocity.current = 0;
    paint();
    setPhase('done');
    if (failure.current) {
      const message = failure.current;
      failure.current = null;
      setPhase('idle');
      onError(message);
      return;
    }
    onFinished(target.current ?? sectorAtRotation(rotation.current, SECTORS));
  }

  function beginStop(now: number) {
    const offset = (Math.random() * 2 - 1) * 0.4; // às vezes para quase na fatia vizinha
    plan.current = planStop({
      rotation: rotation.current,
      velocity: velocity.current,
      targetSector: target.current ?? sectorAtRotation(rotation.current, SECTORS),
      sectors: SECTORS,
      offset,
      minTurns: failure.current ? 1 : 2,
    });
    planStartedAt.current = now;
    setPhase('stopping');
  }

  function loop(now: number, last: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    if (phaseRef.current === 'spinning') {
      const direction = velocity.current < 0 ? -1 : 1;
      const speed = Math.max(MIN_SPIN, Math.abs(velocity.current) * Math.pow(0.85, dt));
      velocity.current = direction * speed;
      rotation.current += velocity.current * dt;
      const autoStop = now - spinStartedAt.current > AUTO_STOP_MS;
      if ((stopRequested.current || autoStop || failure.current) && target.current !== null) beginStop(now);
    } else if (phaseRef.current === 'stopping' && plan.current) {
      const elapsed = now - planStartedAt.current;
      const previous = rotation.current;
      rotation.current = rotationAt(plan.current, elapsed);
      velocity.current = dt > 0 ? (rotation.current - previous) / dt : velocity.current;
      if (elapsed >= plan.current.duration) { rotation.current = rotationAt(plan.current, plan.current.duration); finish(); return; }
    }
    paint();
    frame.current = requestAnimationFrame((next) => loop(next, now));
  }

  function startSpin(initialVelocity: number) {
    if (phaseRef.current === 'spinning' || phaseRef.current === 'stopping' || phaseRef.current === 'done') return;
    setHint('');
    if (!audio.current && typeof window !== 'undefined' && 'AudioContext' in window) {
      try { audio.current = new AudioContext(); } catch { audio.current = null; }
    }
    const direction = initialVelocity < 0 ? -1 : 1;
    velocity.current = direction * Math.min(MAX_SPIN, Math.max(MIN_SPIN, Math.abs(initialVelocity)));
    target.current = null;
    failure.current = null;
    stopRequested.current = false;
    setStopPressed(false);
    spinStartedAt.current = performance.now();
    setPhase('spinning');

    onSpinStart()
      .then((sector) => { target.current = sector; })
      .catch((error: unknown) => {
        failure.current = error instanceof Error ? error.message : 'Não foi possível concluir o giro.';
        target.current = sectorAtRotation(rotation.current, SECTORS);
      });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Sem animação: espera o resultado e posiciona direto.
      const settle = () => {
        if (target.current === null) { frame.current = requestAnimationFrame(settle); return; }
        const stop = planStop({ rotation: rotation.current, velocity: velocity.current, targetSector: target.current, sectors: SECTORS });
        rotation.current = rotationAt(stop, stop.duration);
        finish();
      };
      frame.current = requestAnimationFrame(settle);
      return;
    }
    const now = performance.now();
    frame.current = requestAnimationFrame((next) => loop(next, now));
  }

  function angleFrom(event: ReactPointerEvent) {
    const current = drag.current;
    if (!current) return 0;
    return (Math.atan2(event.clientY - current.centerY, event.clientX - current.centerX) * 180) / Math.PI;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (locked || phaseRef.current !== 'idle') return;
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = { centerX: box.left + box.width / 2, centerY: box.top + box.height / 2, lastAngle: 0, samples: [] };
    drag.current.lastAngle = angleFrom(event);
    drag.current.samples.push({ t: performance.now(), rotation: rotation.current });
    // Captura mantém o arrasto mesmo se o dedo sair da roda; se o navegador recusar, segue sem ela.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* sem captura */ }
    setPhase('dragging');
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || phaseRef.current !== 'dragging') return;
    const angle = angleFrom(event);
    let delta = angle - current.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    current.lastAngle = angle;
    rotation.current += delta;
    const now = performance.now();
    current.samples.push({ t: now, rotation: rotation.current });
    while (current.samples.length > 2 && now - current.samples[0].t > 160) current.samples.shift();
    velocity.current = delta >= 0 ? 1 : -1;
    paint();
  }

  function onPointerUp() {
    const current = drag.current;
    drag.current = null;
    if (!current || phaseRef.current !== 'dragging') return;
    const speed = releaseVelocity(current.samples);
    if (Math.abs(speed) < MIN_FLICK) {
      setPhase('idle');
      setHint('Puxe com mais força! 💪');
      return;
    }
    startSpin(speed);
  }

  const spinning = phase === 'spinning' || phase === 'stopping';

  return <div className={styles.stageWrap} data-phase={phase} data-locked={locked || undefined}>
    <div className={styles.stage}>
      <span ref={pointerRef} className={styles.pointer} aria-hidden="true">
        <svg viewBox="0 0 48 64" width="48" height="64"><path d="M14 2h20v28h12L24 62 2 30h12z" /></svg>
      </span>
      <div
        className={styles.touchArea}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={spinning ? 'Roleta girando' : 'Roleta de prêmios. Arraste para girar ou use o botão Girar.'}
      >
        <div ref={wheelRef} className={styles.wheel}>
          {sectors.map((prize, index) => {
            const angle = index * SECTOR_SIZE + SECTOR_SIZE / 2;
            return <span className={styles.sector} key={index} style={{ transform: `rotate(${angle}deg)` }}>
              <span className={styles.sectorInner}>
                {allSame ? <Image src="/logo.png" alt="" width={36} height={36} /> : <>
                  {SHOW_PHOTOS_IN_WHEEL && prizePhoto(prize) && <Image className={styles.photo} src={prizePhoto(prize) as string} alt="" width={96} height={96} />}
                  <strong>{prize.nome}</strong>
                </>}
              </span>
            </span>;
          })}
          {Array.from({ length: SECTORS }, (_, index) => <i key={index} className={styles.peg} style={{ transform: `rotate(${index * SECTOR_SIZE}deg)` }} aria-hidden="true" />)}
        </div>
        <span className={styles.hub} aria-hidden="true"><Image src="/logo.png" alt="" width={60} height={60} /></span>
      </div>
    </div>

    <div className={styles.controls}>
      {phase === 'idle' && !locked && <>
        <p className={styles.hint}>{hint || 'Arraste a roleta com o dedo'}</p>
        <button type="button" className={styles.spinButton} onClick={() => startSpin(BUTTON_SPIN)}>Girar</button>
      </>}
      {phase === 'dragging' && <p className={styles.hint}>Solte com força</p>}
      {phase === 'spinning' && <button type="button" className={styles.stopButton} onClick={() => { stopRequested.current = true; setStopPressed(true); }} disabled={stopPressed}>
        {stopPressed ? 'Parando…' : 'Parar'}
      </button>}
      {phase === 'stopping' && <p className={styles.suspense}>Vai parar em…</p>}
      <button type="button" className={styles.mute} onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? 'Ligar som' : 'Desligar som'}>{muted ? '🔇' : '🔊'}</button>
    </div>
  </div>;
}
