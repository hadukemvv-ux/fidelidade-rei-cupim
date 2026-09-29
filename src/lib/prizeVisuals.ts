/**
 * Fotos da roleta num lugar só. Para trocar uma foto: colocar o arquivo em
 * public/roleta/ e ajustar aqui. Nenhum outro arquivo precisa mudar.
 */

/** Fundo da página. Provisório: parte do cupim da foto da home, até chegar a foto do cupim trinchado
 * (destino previsto: '/roleta/fundo-cupim.webp'). `position` escolhe o enquadramento (x% y%). */
export const ROLETA_BACKDROP = { src: '/images/home/hero-cupim.webp', position: '50% 90%' };

/**
 * Foto de cada prêmio pelo nome, enquanto a API não envia `imagem_url`.
 * Destinos previstos em public/roleta/premios/: saideira.webp, expulsadeira.webp,
 * sobremesa.webp, brownie.webp, pudim.webp, dindim.webp, entrega.webp.
 */
const PHOTOS: Array<[RegExp, string]> = [
  [/pudim/i, '/produtos/pudim.png'],
  [/brownie/i, '/produtos/brownie.png'],
  [/sobremesa/i, '/produtos/pudim.png'],
];

/** Ligar quando todos os prêmios tiverem foto: a roda passa a mostrar a foto em cada fatia. */
export const SHOW_PHOTOS_IN_WHEEL = false;

export function prizePhoto(nome: string, imagemUrl?: string | null) {
  if (imagemUrl) return imagemUrl;
  return PHOTOS.find(([pattern]) => pattern.test(nome))?.[1] ?? null;
}
