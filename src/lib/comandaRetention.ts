export const RETENCAO_COMANDA_HORAS = 36;
const RETENCAO_COMANDA_MS = RETENCAO_COMANDA_HORAS * 60 * 60 * 1000;

export function dataExpiracaoComanda(agora = new Date()) {
  return new Date(agora.getTime() + RETENCAO_COMANDA_MS);
}

/** Caminhos privados que precisam sair do Storage junto com a comanda. */
export function caminhosDaComanda(
  imagemPrincipal: string,
  imagens: Array<{ imagem_path: string }> = [],
) {
  return [...new Set([imagemPrincipal, ...imagens.map((imagem) => imagem.imagem_path)].filter(Boolean))];
}
