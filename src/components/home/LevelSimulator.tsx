'use client';

import { useState } from 'react';
import {
  calcularCashbackValue, calcularPontosEarned, calcularProgressaoNivel, getAllNivelThresholds,
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
  const cashback = calcularCashbackValue(monthly, windowSpend);
  const next = levels.find((item) => item.nivel === progress.proximoNivel);
  const missingMonthly = next ? monthlyFor(next.min) - monthly : 0;

  return <>
    <div className="simulator">
      <label htmlFor="simulator-range">Quanto você costuma gastar por mês no Rei?</label>
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

    <div className="level-tabs" role="tablist" aria-label="Níveis do programa">
      {levels.map((item) => (
        <button key={item.nivel} type="button" role="tab" aria-selected={level.nivel === item.nivel} aria-controls="level-panel"
          onClick={() => setMonthly(Math.max(monthlyFor(item.min), item.min === 0 ? 20 : 0))}>
          <strong>{levelNames[item.nivel]}</strong>
        </button>
      ))}
    </div>

    <div className="level-panel" id="level-panel" role="tabpanel" aria-live="polite">
      <div className="level-overview">
        <p>Seu nível</p>
        <h3 key={level.nivel} className="level-pop">{levelNames[level.nivel]}</h3>
        <span>{level.min === 0 ? 'Começa no cadastro' : `A partir de ${money(level.min)} em compras`}</span>
        <p className="simulator-next">{next
          ? <>Com mais <b>{money(missingMonthly)}</b> por mês você chega ao nível <b>{levelNames[next.nivel]}</b>.</>
          : <>Você está no topo: <b>nível máximo</b> do Clube.</>}</p>
      </div>
      <div className="level-metrics">
        <article>
          <strong>{benefitNumber(points)}</strong>
          <span>pontos por mês</span>
          <b>{money(points / PONTOS_POR_REAL_EM_PRODUTOS, 2)} em produtos · {benefit.pontosPorReal} {benefit.pontosPorReal === 1 ? 'ponto' : 'pontos'} por real</b>
        </article>
        <article>
          <strong>{money(cashback, 2)}</strong>
          <span>cashback por mês</span>
          <b>{percent(benefit.percentualCashback)} em desconto</b>
        </article>
        <article className="total-benefit">
          <strong>{percent(benefit.percentualTotalReferencia)}</strong>
          <span>valor equivalente em benefícios</span>
        </article>
      </div>
      <p className="points-note">{PONTOS_POR_REAL_EM_PRODUTOS} pontos = R$ 1 em produtos. Pontos (produtos) e cashback (descontos) são saldos separados; o total equivalente soma os dois, não é todo cashback.</p>
      <p className="points-note">Simulação com compras elegíveis de {money(monthly)} por mês mantidas por {MONTHS_IN_WINDOW} meses: seu nível considera os últimos {JANELA_NIVEL_DIAS} dias e cada compra vale pelo nível anterior a ela.</p>
    </div>
  </>;
}

function benefitNumber(value: number) {
  return value.toLocaleString('pt-BR');
}
