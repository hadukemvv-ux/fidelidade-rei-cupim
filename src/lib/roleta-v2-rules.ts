/**
 * Faixas da compra usadas exclusivamente para ponderar a Roleta V2.
 * Elas não substituem os níveis de fidelidade, que consideram o gasto do
 * cliente em 90 dias. Aqui a regra é sempre o valor da compra que originou
 * o QR, para que a equipe não escolha manualmente uma chance maior.
 */
export type NivelRoletaV2 = 1 | 2 | 3 | 4 | 5 | 6;

export type FaixaRoletaV2 = {
  nivel: NivelRoletaV2;
  nome: string;
  minimo: number;
  maximo: number | null;
};

const FAIXAS: readonly FaixaRoletaV2[] = [
  { nivel: 1, nome: "Conta até R$ 100", minimo: 0, maximo: 100 },
  { nivel: 2, nome: "Conta entre R$ 100 e R$ 200", minimo: 100.01, maximo: 200 },
  { nivel: 3, nome: "Conta entre R$ 200 e R$ 300", minimo: 200.01, maximo: 300 },
  { nivel: 4, nome: "Conta entre R$ 300 e R$ 400", minimo: 300.01, maximo: 400 },
  { nivel: 5, nome: "Conta entre R$ 400 e R$ 500", minimo: 400.01, maximo: 500 },
  { nivel: 6, nome: "Conta acima de R$ 500", minimo: 500.01, maximo: null },
];

export function getFaixaRoletaV2(valorComanda: number): FaixaRoletaV2 {
  if (!Number.isFinite(valorComanda) || valorComanda < 0) {
    throw new Error("O valor da comanda deve ser um número não negativo.");
  }

  return FAIXAS.find((faixa) => faixa.maximo === null || valorComanda <= faixa.maximo) ?? FAIXAS[FAIXAS.length - 1];
}

export function getFaixasRoletaV2(): readonly FaixaRoletaV2[] {
  return FAIXAS;
}
