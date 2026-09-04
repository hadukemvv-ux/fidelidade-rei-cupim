/** Regras centrais do programa. 100 pontos representam R$ 1 em produtos. */
export type NivelFidelidade = 'BRONZE' | 'PRATA' | 'OURO' | 'REI';

export interface BeneficioNivel { pontos: number; cashback: number; tickets: number }

// O custo acompanha o valor percebido de uma entrega e impede que o bônus
// inicial de cadastro seja convertido imediatamente em frete grátis.
export const CUSTO_ENTREGA_GRATIS_PONTOS = 1000;
export interface NivelInfo {
  nivel: NivelFidelidade;
  nome: string;
  beneficio: BeneficioNivel;
  gastoMinimo: number;
  gastoMaximo: number | null;
}

export const JANELA_NIVEL_DIAS = 90;
export const REAIS_POR_LOTE_TICKETS = 100;

const NIVEIS: Record<NivelFidelidade, NivelInfo> = {
  BRONZE: { nivel: 'BRONZE', nome: 'Brasa', gastoMinimo: 0, gastoMaximo: 99.99, beneficio: { pontos: 1, cashback: 0, tickets: 1 } },
  PRATA: { nivel: 'PRATA', nome: 'Chama', gastoMinimo: 100, gastoMaximo: 249.99, beneficio: { pontos: 2, cashback: 0.005, tickets: 2 } },
  OURO: { nivel: 'OURO', nome: 'Nobre', gastoMinimo: 250, gastoMaximo: 499.99, beneficio: { pontos: 4, cashback: 0.01, tickets: 5 } },
  REI: { nivel: 'REI', nome: 'Majestade — Rei do Cupim', gastoMinimo: 500, gastoMaximo: null, beneficio: { pontos: 7, cashback: 0.03, tickets: 10 } },
};

export function getNivelPorGasto(gastoElegivel90Dias: number): NivelInfo {
  if (!Number.isFinite(gastoElegivel90Dias) || gastoElegivel90Dias < 0) throw new Error('Gasto elegível deve ser um número não negativo');
  if (gastoElegivel90Dias >= 500) return NIVEIS.REI;
  if (gastoElegivel90Dias >= 250) return NIVEIS.OURO;
  if (gastoElegivel90Dias >= 100) return NIVEIS.PRATA;
  return NIVEIS.BRONZE;
}

export function getNivelInfo(nivel: NivelFidelidade | string): NivelInfo {
  const info = NIVEIS[String(nivel).toUpperCase() as NivelFidelidade];
  if (!info) throw new Error(`Nível inválido: ${nivel}`);
  return info;
}

export function calcularProgressaoNivel(gastoElegivel90Dias: number) {
  const atual = getNivelPorGasto(gastoElegivel90Dias);
  const ordem: NivelFidelidade[] = ['BRONZE', 'PRATA', 'OURO', 'REI'];
  const proximo = NIVEIS[ordem[ordem.indexOf(atual.nivel) + 1]] || null;
  return {
    nivel: atual.nivel,
    nome: atual.nome,
    beneficio: atual.beneficio,
    gastoAcumulado: gastoElegivel90Dias,
    janelaDias: JANELA_NIVEL_DIAS,
    proximoNivel: proximo?.nivel || null,
    progresso: proximo ? {
      minimo: proximo.gastoMinimo,
      maximo: proximo.gastoMaximo,
      gastoFaltante: Math.max(0, proximo.gastoMinimo - gastoElegivel90Dias),
      percentual: Math.min(100, Math.max(0, ((gastoElegivel90Dias - atual.gastoMinimo) / (proximo.gastoMinimo - atual.gastoMinimo)) * 100)),
    } : null,
  };
}

/** A compra recebe o benefício do nível que o cliente possuía antes dela. */
export function calcularPontosEarned(valorCompra: number, gastoAnterior90Dias: number): number {
  return Math.floor(valorCompra * getNivelPorGasto(gastoAnterior90Dias).beneficio.pontos);
}

/** O ledger persistente transportará frações de ticket entre compras. */
export function calcularTicketsEarned(valorCompra: number, gastoAnterior90Dias: number): number {
  const multiplicador = getNivelPorGasto(gastoAnterior90Dias).beneficio.tickets;
  return Math.floor((valorCompra / REAIS_POR_LOTE_TICKETS) * multiplicador);
}

export function calcularCashbackValue(valorCompra: number, gastoAnterior90Dias: number): number {
  const valor = valorCompra * getNivelPorGasto(gastoAnterior90Dias).beneficio.cashback;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function getAllNivelThresholds() {
  return (['BRONZE', 'PRATA', 'OURO', 'REI'] as NivelFidelidade[]).map((nivel) => ({
    nivel, nome: NIVEIS[nivel].nome, min: NIVEIS[nivel].gastoMinimo,
    max: NIVEIS[nivel].gastoMaximo, beneficio: { ...NIVEIS[nivel].beneficio },
  }));
}
