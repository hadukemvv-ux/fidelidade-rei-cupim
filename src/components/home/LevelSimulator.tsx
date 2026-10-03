'use client';

import { useState } from 'react';
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

/** Só apresentação: todos os números saem de fidelidade-rules, nada é calculado por conta própria. */
export default function LevelSimulator() {
  const [monthly, setMonthly] = useState(60);
  const windowSpend = monthly * MONTHS_IN_WINDOW;
  const progress = calcularProgressaoNivel(windowSpend);
  const level = levels.find((item) => item.nivel === progress.nivel) ?? levels[0];
  const benefit = getResumoBeneficiosNivel(level.nivel);
  const points = calcularPontosEarned(monthly, windowSpend);

  return <>
    <div className="simulator" data-reveal="up">
      <label htmlFor="simulator-range">Quanto você costuma gastar por mês no Rei do Cupim?</label>
      <output htmlFor="simulator-range" className="simulator-value">{money(monthly)}<small>por mês</small></output>
      <div className="simulator-track">
        <input id="simulator-range" type="range" min={0} max={MAX_MONTHLY} step={STEP} value={monthly}
          style={{ '--fill': `${(monthly / MAX_MONTHLY) * 100}%` } as React.CSSProperties}
          aria-valuetext={`${money(monthly)} por mês, nível ${levelNames[level.nivel]}`}
          onChange={(event) => setMonthly(Number(event.target.value))} />
        <div className="simulator-marks" aria-hidden="true">
          {levels.filter((item) => item.min > 0).map((item) => (
            <i key={item.nivel} style={{ left: `${(monthlyFor(item.min) / MAX_MONTHLY) * 100}%` }} />
          ))}
        </div>
      </div>
      <p className="simulator-hint" aria-hidden="true">← arraste para simular →</p>
    </div>

    <div className="level-tabs" data-reveal="up" role="tablist" aria-label="Níveis do programa">
      {levels.map((item) => (
        <button key={item.nivel} type="button" role="tab" aria-selected={level.nivel === item.nivel} aria-controls="level-panel"
          onClick={() => setMonthly(Math.max(monthlyFor(item.min), item.min === 0 ? 20 : 0))}>
          <strong>{levelNames[item.nivel]}</strong>
        </button>
      ))}
    </div>

    <div className="level-panel" data-reveal="up" id="level-panel" role="tabpanel" aria-live="polite">
      <div className="level-overview">
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
