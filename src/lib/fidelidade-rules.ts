/**
 * Central source of truth for loyalty program (fidelidade) rules
 * All point calculations, level progressions, and benefits must use this file
 */

export type NivelFidelidade = 'BRONZE' | 'PRATA' | 'OURO' | 'REI';

export interface BeneficioNivel {
  pontos: number;          // Points awarded per R$ spent
  cashback: number;        // Cashback percentage (0.0025 = 0.25%)
  tickets: number;         // Tickets awarded per R$ 50 spent
}

export interface NivelInfo {
  nivel: NivelFidelidade;
  beneficio: BeneficioNivel;
  gastoMinimo: number;     // Minimum R$ spent to achieve this level
  gastoMaximo: number | null; // Maximum R$ for this level (null = unlimited)
}

/**
 * RULES DEFINITION - Single source of truth
 * All loyalty program logic is based on:
 * - Customer spending tier (R$ gasto total)
 * - Points = R$ spent × multiplicador
 * - Cashback = (R$ spent × cashback_percent) - monthly or redemption
 * - Tickets = 1 per R$ 50 spent × multiplicador
 */
const NIVEIS: Record<NivelFidelidade, NivelInfo> = {
  BRONZE: {
    nivel: 'BRONZE',
    beneficio: {
      pontos: 4,
      cashback: 0.0025,      // 0.25%
      tickets: 1,
    },
    gastoMinimo: 0,
    gastoMaximo: 99.99,
  },
  PRATA: {
    nivel: 'PRATA',
    beneficio: {
      pontos: 7,
      cashback: 0.01,        // 1%
      tickets: 2,
    },
    gastoMinimo: 100,
    gastoMaximo: 299.99,
  },
  OURO: {
    nivel: 'OURO',
    beneficio: {
      pontos: 10,
      cashback: 0.02,        // 2%
      tickets: 3,
    },
    gastoMinimo: 300,
    gastoMaximo: 599.99,
  },
  REI: {
    nivel: 'REI',
    beneficio: {
      pontos: 14,
      cashback: 0.03,        // 3%
      tickets: 4,
    },
    gastoMinimo: 600,
    gastoMaximo: null,
  },
};

/**
 * Get level info by total accumulated spending (R$ gasto)
 * @param gastoTotal Total customer spending in R$
 * @returns NivelInfo object with level and benefits
 */
export function getNivelPorGasto(gastoTotal: number): NivelInfo {
  // Validate input
  if (gastoTotal < 0) {
    throw new Error('Gasto total não pode ser negativo');
  }

  // Return level based on spending threshold
  if (gastoTotal >= 600) {
    return NIVEIS.REI;
  } else if (gastoTotal >= 300) {
    return NIVEIS.OURO;
  } else if (gastoTotal >= 100) {
    return NIVEIS.PRATA;
  } else {
    return NIVEIS.BRONZE;
  }
}

/**
 * Get nivel by name
 * @param nivel Level name
 * @returns NivelInfo object or throws error if invalid
 */
export function getNivelInfo(nivel: NivelFidelidade | string): NivelInfo {
  const nivelUpper = (nivel as string).toUpperCase();
  const info = NIVEIS[nivelUpper as NivelFidelidade];
  
  if (!info) {
    throw new Error(`Nível inválido: ${nivel}. Deve ser BRONZE, PRATA, OURO ou REI`);
  }
  
  return info;
}

/**
 * Calculate level progression info
 * @param gastoAtual Current customer spending
 * @returns Object with current level, progress, and next level info
 */
export function calcularProgressaoNivel(gastoAtual: number) {
  const levelAtual = getNivelPorGasto(gastoAtual);

  // Determine next level
  const nivelAtualEnum = levelAtual.nivel;
  let proximoNivel: NivelInfo | null = null;

  if (nivelAtualEnum === 'BRONZE') {
    proximoNivel = NIVEIS.PRATA;
  } else if (nivelAtualEnum === 'PRATA') {
    proximoNivel = NIVEIS.OURO;
  } else if (nivelAtualEnum === 'OURO') {
    proximoNivel = NIVEIS.REI;
  }
  // REI has no next level

  const progressoAteProximo = proximoNivel
    ? {
        minimo: proximoNivel.gastoMinimo,
        maximo: proximoNivel.gastoMaximo,
        gastoFaltante: Math.max(0, proximoNivel.gastoMinimo - gastoAtual),
        percentual: Math.min(
          100,
          ((gastoAtual - levelAtual.gastoMinimo) /
            (proximoNivel.gastoMinimo - levelAtual.gastoMinimo)) *
            100
        ),
      }
    : null;

  return {
    nivel: levelAtual.nivel,
    beneficio: levelAtual.beneficio,
    gastoAcumulado: gastoAtual,
    proximoNivel: proximoNivel?.nivel || null,
    progresso: progressoAteProximo,
  };
}

/**
 * Calculate points earned for a purchase
 * @param valorCompra Purchase amount in R$
 * @param gastoTotalCliente Total customer spending (to determine level)
 * @returns Points earned
 */
export function calcularPontosEarned(
  valorCompra: number,
  gastoTotalCliente: number
): number {
  const nivel = getNivelPorGasto(gastoTotalCliente);
  const pontosEarned = Math.floor(valorCompra * nivel.beneficio.pontos);
  return pontosEarned;
}

/**
 * Calculate tickets earned for a purchase
 * Tickets = 1 per R$ 50 spent × multiplicador nivel
 * @param valorCompra Purchase amount in R$
 * @param gastoTotalCliente Total customer spending (to determine level)
 * @returns Tickets earned
 */
export function calcularTicketsEarned(
  valorCompra: number,
  gastoTotalCliente: number
): number {
  const nivel = getNivelPorGasto(gastoTotalCliente);
  const ticketsEarned = Math.floor((valorCompra / 50) * nivel.beneficio.tickets);
  return ticketsEarned;
}

/**
 * Calculate cashback value for a purchase
 * @param valorCompra Purchase amount in R$
 * @param gastoTotalCliente Total customer spending (to determine level)
 * @returns Cashback amount in R$
 */
export function calcularCashbackValue(
  valorCompra: number,
  gastoTotalCliente: number
): number {
  const nivel = getNivelPorGasto(gastoTotalCliente);
  const cashback = valorCompra * nivel.beneficio.cashback;
  return cashback;
}

/**
 * Get all level thresholds (useful for UI, documentation)
 * @returns Array of level thresholds
 */
export function getAllNivelThresholds() {
  return [
    { nivel: 'BRONZE', min: 0, max: 99.99 },
    { nivel: 'PRATA', min: 100, max: 299.99 },
    { nivel: 'OURO', min: 300, max: 599.99 },
    { nivel: 'REI', min: 600, max: null },
  ];
}
