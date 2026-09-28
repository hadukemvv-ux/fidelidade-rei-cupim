export type ImmediatePrize = 'saideira' | 'expulsadeira' | 'sobremesa';
export type DeliveryProduct = { id: string; nome: string; unidade: string; categoria: 'cerveja' | 'sobremesa'; ativo: boolean };

/** As opções são carregadas pelo servidor. Cerveja elegível é a consumida na conta. */
export function deliveryChoices(prize: ImmediatePrize, products: DeliveryProduct[], consumedBeerIds: readonly string[]) {
  const category = prize === 'sobremesa' ? 'sobremesa' : 'cerveja';
  const allowed = new Set(consumedBeerIds);
  return products.filter((item) => item.ativo && item.categoria === category && (category === 'sobremesa' || allowed.has(item.id)));
}

export function confirmedDelivery(prize: ImmediatePrize, selectedId: string, choices: DeliveryProduct[]) {
  const product = choices.find((item) => item.id === selectedId);
  if (!product || product.categoria !== (prize === 'sobremesa' ? 'sobremesa' : 'cerveja') || !product.ativo) {
    throw new Error('Produto não permitido para este prêmio.');
  }
  return { produto_id: product.id, produto_nome: product.nome, unidade: product.unidade, quantidade: prize === 'expulsadeira' ? 2 : 1 };
}

/** Vencimento gera alerta, não comprova entrega e não autoriza apagar a pendência. */
export function deliveryOverdue(createdAt: string, now = new Date()) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created) || !Number.isFinite(now.getTime())) throw new Error('Data inválida.');
  return now.getTime() - created >= 72 * 60 * 60 * 1000;
}
