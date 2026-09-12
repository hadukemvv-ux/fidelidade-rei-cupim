/**
 * Faixas da compra usadas exclusivamente para ponderar a Roleta V2.
 * Elas não substituem os níveis de fidelidade, que consideram o gasto do
 * cliente em 90 dias. Aqui a regra é sempre o valor da compra que originou
 * o QR, para que a equipe não escolha manualmente uma chance maior.
 */
export type NivelRoletaV2 = 1 | 2 | 3 | 4 | 5;

export type FaixaRoletaV2 = {
  nivel: NivelRoletaV2;
  nome: string;
  minimo: number;
  maximo: number | null;
};

const FAIXAS: readonly FaixaRoletaV2[] = [
  { nivel: 1, nome: "Brasa", minimo: 0, maximo: 99.99 },
  { nivel: 2, nome: "Chama", minimo: 100, maximo: 249.99 },
  { nivel: 3, nome: "Nobre", minimo: 250, maximo: 399.99 },
  { nivel: 4, nome: "Rei", minimo: 400, maximo: 499.99 },
  { nivel: 5, nome: "Lenda", minimo: 500, maximo: null },
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
