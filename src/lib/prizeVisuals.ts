/**
 * Foto de cada prêmio na roleta, escolhida pelo nome enquanto a API não envia
 * `imagem_url`. Prêmio sem foto aprovada usa o emoji do catálogo.
 * Fotos reais ficam em public/roleta/premios/.
 */
const PHOTOS: Array<[RegExp, string]> = [
  [/sobremesa|pudim/i, '/produtos/pudim.png'],
  [/brownie/i, '/produtos/brownie.png'],
];

export function prizePhoto(nome: string, imagemUrl?: string | null) {
  if (imagemUrl) return imagemUrl;
  return PHOTOS.find(([pattern]) => pattern.test(nome))?.[1] ?? null;
}
