export const DIAS_MINIMOS_RECONCILIACAO = 3;
export const DIAS_MAXIMOS_RECONCILIACAO = 90;

/**
 * Mantém pendências antigas na consulta automática sem buscar um histórico
 * ilimitado da Saipos. A janela cresce até alcançar a comanda pendente mais
 * antiga e tem um teto explícito para preservar o cron previsível.
 */
export function diasDeConsultaParaPendencias(criadosEm: string[], agora = new Date()) {
  const maisAntiga = criadosEm
    .map((valor) => new Date(valor).getTime())
    .filter(Number.isFinite)
    .reduce((menor, valor) => Math.min(menor, valor), agora.getTime());
  const diferencaEmDias = Math.ceil(Math.max(0, agora.getTime() - maisAntiga) / 86_400_000) + 1;
  return Math.min(DIAS_MAXIMOS_RECONCILIACAO, Math.max(DIAS_MINIMOS_RECONCILIACAO, diferencaEmDias));
}
