'use client';

import { useEffect, useRef, useState } from 'react';
import {
  calcularPontosEarned, calcularProgressaoNivel, getAllNivelThresholds,
  getResumoBeneficiosNivel, JANELA_NIVEL_DIAS, PONTOS_POR_REAL_EM_PRODUTOS, type NivelFidelidade,
} from '@/lib/fidelidade-rules';

const levels = getAllNivelThresholds();
const levelNames: Record<NivelFidelidade, string> = { BRONZE: 'Brasa', PRATA: 'Chama', OURO: 'Nobre', REI: 'Majestade' };

// O nível olha 90 dias; a pessoa pensa em "por mês". A simulação supõe o mesmo gasto nos 3 meses.
const MONTHS_IN_WINDOW = JANELA_NIVEL_DIAS / 30;
const STEP = 5;
const MAX_MONTHLY = 300;
/** Menor gasto mensal (no passo da barra) que já alcança o nível. */
const monthlyFor = (min: number) => Math.ceil(min / MONTHS_IN_WINDOW / STEP) * STEP;

const money = (value: number, digits = 0) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Número que "conta" até o novo valor em vez de trocar de uma vez. */
function useCountUp(target: number, duration = 380) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current, start = performance.now();
    if (from === target) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / duration);
      current.current = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return shown;
}

function Flame() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.6 3.4-1 5-2.6 6.8C7.8 10.6 6 12.5 6 15.4a6 6 0 0 0 12 0c0-2.3-1-4-2.2-5.5-.3 1.3-1 2.2-2 2.7.5-3.7-.3-7.4-1.8-10.6Z"/></svg>;
}

/** Só apresentação: todos os números saem de fidelidade-rules, nada é calculado por conta própria. */
export default function LevelSimulator() {
  const [monthly, setMonthly] = useState(60);
  const windowSpend = monthly * MONTHS_IN_WINDOW;
  const progress = calcularProgressaoNivel(windowSpend);
  const level = levels.find((item) => item.nivel === progress.nivel) ?? levels[0];
  const benefit = getResumoBeneficiosNivel(level.nivel);
  const points = useCountUp(calcularPontosEarned(monthly, windowSpend));
  const levelIndex = levels.findIndex((item) => item.nivel === level.nivel);

  // Subiu ou desceu de nível: um toque de vibração no celular, como passar de fase.
  function change(next: number) {
    const nextLevel = calcularProgressaoNivel(next * MONTHS_IN_WINDOW).nivel;
    if (nextLevel !== level.nivel && 'vibrate' in navigator) navigator.vibrate?.(nextLevel === 'REI' ? [30, 40, 60] : 25);
    setMonthly(next);
  }

  return <>
    <div className="simulator" data-reveal="up">
      <label htmlFor="simulator-range">Quanto você costuma gastar por mês no Rei do Cupim?</label>
      <output htmlFor="simulator-range" className="simulator-value">{money(monthly)}<small>por mês</small></output>
      <div className="simulator-track">
        <input id="simulator-range" type="range" min={0} max={MAX_MONTHLY} step={STEP} value={monthly}
          style={{ '--fill': `${(monthly / MAX_MONTHLY) * 100}%` } as React.CSSProperties}
          aria-valuetext={`${money(monthly)} por mês, nível ${levelNames[level.nivel]}`}
          onChange={(event) => change(Number(event.target.value))} />
        <div className="simulator-marks" aria-hidden="true">
          {levels.filter((item) => item.min > 0).map((item) => (
            <i key={item.nivel} style={{ left: `${(monthlyFor(item.min) / MAX_MONTHLY) * 100}%` }} />
          ))}
        </div>
      </div>
      <p className="simulator-hint" aria-hidden="true">← arraste para simular →</p>
    </div>

    <div className="level-trail" data-reveal="up" data-level={levelIndex} role="tablist" aria-label="Níveis do programa">
      {levels.map((item, index) => (
        <button key={item.nivel} type="button" role="tab" aria-selected={level.nivel === item.nivel} aria-controls="level-panel"
          className={index <= levelIndex ? 'is-lit' : ''}
          onClick={() => change(Math.max(monthlyFor(item.min), item.min === 0 ? 20 : 0))}>
          <i><Flame /></i>
          <strong>{levelNames[item.nivel]}</strong>
        </button>
      ))}
    </div>

    <div className="level-panel" data-reveal="up" id="level-panel" role="tabpanel" aria-live="polite">
      <div className="level-overview" data-level={levelIndex}>
        <span key={`flame-${level.nivel}`} className="level-flame"><Flame /></span>
        <p>Seu nível</p>
        <h3 key={level.nivel} className="level-pop">{levelNames[level.nivel]}</h3>
      </div>
      <div className="level-metrics">
        <article>
          <strong>{points.toLocaleString('pt-BR')}</strong>
          <span>pontos por mês</span>
        </article>
        <article>
          <strong>{percent(benefit.percentualCashback)}</strong>
          <span>cashback</span>
        </article>
        <article className="total-benefit">
          <strong>{percent(benefit.percentualTotalReferencia)}</strong>
          <span>valor equivalente em benefícios</span>
        </article>
      </div>
      <p className="points-note">{PONTOS_POR_REAL_EM_PRODUTOS} pontos = R$ 1 em produtos. Simulação com compras elegíveis dos últimos {JANELA_NIVEL_DIAS} dias.</p>
    </div>
  </>;
}
