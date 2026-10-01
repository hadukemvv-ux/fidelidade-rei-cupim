/**
 * Fotos da roleta num lugar só. Para trocar uma foto: colocar o arquivo em
 * public/roleta/ e ajustar aqui. Nenhum outro arquivo precisa mudar.
 */

/** Fundo da página: cupim trinchado na tábua (foto do responsável, 29/09/2026).
 * `position` escolhe o ponto de foco (x% y%) e `zoom` aproxima esse ponto. */
export const ROLETA_BACKDROP = { src: '/roleta/fundo-cupim.webp', position: '50% 40%', zoom: 1.45 };

/**
 * Foto de cada prêmio pelo nome, enquanto a API não envia `imagem_url`.
 * Fotos de banco de imagem (Pexels, licença comercial gratuita, sem marcas):
 * garrafas por Diana, pudim por Gu Ko, brownie por Sylwester Ficek. Ainda faltam
 * dindim.webp e entrega.webp (preferir fotos do próprio restaurante).
 */
const PHOTOS: Array<[RegExp, string]> = [
  [/expulsadeira/i, '/roleta/premios/expulsadeira.webp'],
  [/saideira/i, '/roleta/premios/saideira.webp'],
  [/pudim/i, '/roleta/premios/pudim.webp'],
  [/brownie/i, '/roleta/premios/brownie.webp'],
  [/sobremesa/i, '/roleta/premios/sobremesa.webp'],
];

const ALCOHOL_NOTICE = 'Beba com moderação. Proibido para menores de 18 anos.';

/** Avisos mostrados embaixo do prêmio ganho. Cerveja: vale a mesma que o cliente consumiu. */
const NOTES: Array<[RegExp, string[]]> = [
  [/expulsadeira/i, ['Seu prêmio é 2 unidades da mesma cerveja que você consumiu.', ALCOHOL_NOTICE]],
  [/saideira/i, ['Seu prêmio é 1 unidade da mesma cerveja que você consumiu.', ALCOHOL_NOTICE]],
];

export function prizeNotes(nome: string) {
  return NOTES.find(([pattern]) => pattern.test(nome))?.[1] ?? [];
}

/** Ligar quando todos os prêmios tiverem foto: a roda passa a mostrar a foto em cada fatia. */
export const SHOW_PHOTOS_IN_WHEEL = false;

export function prizePhoto(nome: string, imagemUrl?: string | null) {
  if (imagemUrl) return imagemUrl;
  return PHOTOS.find(([pattern]) => pattern.test(nome))?.[1] ?? null;
}
