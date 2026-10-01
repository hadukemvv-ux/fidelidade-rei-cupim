/**
 * Fotos da roleta num lugar só. Para trocar uma foto padrão: colocar o arquivo em
 * public/roleta/ e ajustar aqui. Fotos enviadas pelo painel (imagem_url) têm prioridade.
 */

/** Fundo da página: cupim trinchado na tábua (foto do responsável, 29/09/2026).
 * `position` escolhe o ponto de foco (x% y%) e `zoom` aproxima esse ponto. */
export const ROLETA_BACKDROP = { src: '/roleta/fundo-cupim.webp', position: '50% 40%', zoom: 1.45 };

/** O mínimo que a tela sabe de um prêmio. `tipo` vem da API; o nome é editável e só serve de reserva. */
export type PrizeIdentity = { nome: string; tipo?: string | null; imagem_url?: string | null };

/**
 * Fotos padrão por tipo de prêmio (Pexels, licença comercial gratuita, sem marcas):
 * garrafas por Diana, pudim por Gu Ko, brownie por Sylwester Ficek. Ainda faltam
 * dindim e entrega (preferir fotos do próprio restaurante).
 */
const PHOTOS_BY_TYPE: Record<string, string> = {
  saideira: '/roleta/premios/saideira.webp',
  expulsadeira: '/roleta/premios/expulsadeira.webp',
  sobremesa: '/roleta/premios/sobremesa.webp',
};

/** Reserva pelo nome, para respostas antigas sem `tipo` (antes das migrações) e para a demonstração. */
const PHOTOS_BY_NAME: Array<[RegExp, string]> = [
  [/expulsadeira/i, PHOTOS_BY_TYPE.expulsadeira],
  [/saideira/i, PHOTOS_BY_TYPE.saideira],
  [/pudim/i, '/roleta/premios/pudim.webp'],
  [/brownie/i, '/roleta/premios/brownie.webp'],
  [/sobremesa/i, PHOTOS_BY_TYPE.sobremesa],
];

const ALCOHOL_NOTICE = 'Beba com moderação. Proibido para menores de 18 anos.';

/** Avisos mostrados embaixo do prêmio ganho. Cerveja: vale a mesma que o cliente consumiu. */
const NOTES_BY_TYPE: Record<string, string[]> = {
  expulsadeira: ['Seu prêmio é 2 unidades da mesma cerveja que você consumiu.', ALCOHOL_NOTICE],
  saideira: ['Seu prêmio é 1 unidade da mesma cerveja que você consumiu.', ALCOHOL_NOTICE],
};

function typeFromName(nome: string) {
  if (/expulsadeira/i.test(nome)) return 'expulsadeira';
  if (/saideira/i.test(nome)) return 'saideira';
  return null;
}

export function prizeNotes(prize: PrizeIdentity) {
  const tipo = prize.tipo || typeFromName(prize.nome);
  return (tipo && NOTES_BY_TYPE[tipo]) || [];
}

/** Ligar quando todos os prêmios tiverem foto: a roda passa a mostrar a foto em cada fatia. */
export const SHOW_PHOTOS_IN_WHEEL = false;

export function prizePhoto(prize: PrizeIdentity) {
  if (prize.imagem_url) return prize.imagem_url;
  if (prize.tipo) return PHOTOS_BY_TYPE[prize.tipo] ?? null;
  return PHOTOS_BY_NAME.find(([pattern]) => pattern.test(prize.nome))?.[1] ?? null;
}
