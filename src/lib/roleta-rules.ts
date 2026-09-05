export type NivelRoleta = 1 | 2 | 3;

export type PremioRoletaRegra = {
  id: number;
  nome: string;
  tipo: string;
  probabilidade: number;
  ativo?: boolean;
  participa_roleta?: boolean;
};

/** Regra histórica: o PlayStation pertence ao prêmio especial, não à roleta diária. */
export function premioReservado(premio: Pick<PremioRoletaRegra, 'nome'>) {
  const configurado = (premio as Partial<PremioRoletaRegra>).participa_roleta;
  return configurado === false || premio.nome.toLocaleLowerCase('pt-BR').includes('playstation');
}

export function premioParticipaDaRoleta(premio: PremioRoletaRegra) {
  return premio.ativo !== false && !premioReservado(premio) && Number(premio.probabilidade) > 0;
}

export function pesoPorNivel(premio: PremioRoletaRegra, nivel: NivelRoleta) {
  if (!premioParticipaDaRoleta(premio)) return 0;
  const pesoBase = Math.max(0, Math.floor(Number(premio.probabilidade) || 0));
  if (nivel === 1) return pesoBase;
  if (premio.tipo === 'nada') return Math.max(1, Math.floor(pesoBase * (nivel === 2 ? .7 : .4)));
  return Math.floor(pesoBase * (nivel === 2 ? 1.5 : 2.5));
}

export function chancesPorNivel(premios: PremioRoletaRegra[], nivel: NivelRoleta) {
  const pesos = premios.map((premio) => pesoPorNivel(premio, nivel));
  const total = pesos.reduce((sum, value) => sum + value, 0);
  return new Map(premios.map((premio, index) => [premio.id, total ? (pesos[index] / total) * 100 : 0]));
}

export function sortearPremioPorPeso<T extends PremioRoletaRegra>(premios: T[], nivel: NivelRoleta, aleatorio = Math.random()) {
  const candidatos = premios.map((premio) => ({ premio, peso: pesoPorNivel(premio, nivel) })).filter((item) => item.peso > 0);
  const total = candidatos.reduce((sum, item) => sum + item.peso, 0);
  if (!total) return null;
  let alvo = Math.min(Math.max(aleatorio, 0), 1 - Number.EPSILON) * total;
  for (const item of candidatos) {
    alvo -= item.peso;
    if (alvo < 0) return item.premio;
  }
  return candidatos.at(-1)?.premio || null;
}
