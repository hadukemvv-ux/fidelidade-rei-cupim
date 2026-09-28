import { confirmedDelivery, deliveryChoices, type DeliveryProduct, type ImmediatePrize } from './prizeDeliveryRules.ts';

export const demoProducts: DeliveryProduct[] = [
  { id: 'beer-a', nome: 'Cerveja A', unidade: 'garrafa 600 ml', categoria: 'cerveja', ativo: true },
  { id: 'beer-b', nome: 'Cerveja B', unidade: 'garrafa 600 ml', categoria: 'cerveja', ativo: true },
  { id: 'brownie', nome: 'Brownie', unidade: 'unidade', categoria: 'sobremesa', ativo: true },
  { id: 'pudim', nome: 'Pudim', unidade: 'fatia', categoria: 'sobremesa', ativo: true },
  { id: 'dindim', nome: 'Dindim gourmet — chocolate', unidade: 'unidade', categoria: 'sobremesa', ativo: true },
];
export type DemoDelivery = {
  id: string; prize: ImmediatePrize; createdAt: string; consumedBeerIds: string[];
  status: 'pendente' | 'selecionada' | 'entregue' | 'nao_entregue';
  selectedId?: string; delivery?: ReturnType<typeof confirmedDelivery>;
  deliveredAt?: string; postedAt?: string;
  events: { at: string; actor: string; action: string }[];
};
type DemoAction = { type: 'select'; productId: string } | { type: 'deliver' | 'post' | 'cancel' };

export function demoTransition(record: DemoDelivery, action: DemoAction, now: Date): DemoDelivery {
  if (!Number.isFinite(now.getTime())) throw new Error('Data inválida.');
  const at = now.toISOString();
  const next = { ...record };
  let description: string;
  if (action.type === 'select') {
    if (record.status !== 'pendente' && record.status !== 'selecionada') throw new Error('Esta entrega já foi encerrada.');
    confirmedDelivery(record.prize, action.productId, deliveryChoices(record.prize, demoProducts, record.consumedBeerIds));
    next.selectedId = action.productId;
    next.status = 'selecionada';
    description = `Item escolhido: ${action.productId}`;
  } else if (action.type === 'deliver') {
    if (record.status !== 'selecionada' || !record.selectedId) throw new Error('Escolha o item antes de confirmar a entrega.');
    next.delivery = confirmedDelivery(record.prize, record.selectedId, deliveryChoices(record.prize, demoProducts, record.consumedBeerIds));
    next.status = 'entregue';
    next.deliveredAt = at;
    description = 'Entrega física confirmada';
  } else if (action.type === 'post') {
    if (record.status !== 'entregue' || record.postedAt) throw new Error('Somente uma entrega ainda não lançada pode receber baixa.');
    next.postedAt = at;
    description = 'Baixa manual simulada na Saipos';
  } else {
    if (record.status !== 'pendente' && record.status !== 'selecionada') throw new Error('Esta entrega já foi encerrada.');
    next.status = 'nao_entregue';
    description = 'Encerrado sem entrega';
  }
  next.events = [...record.events, { at, actor: 'Operador fictício', action: description }];
  return next;
}

/** Agrupa pela data local da entrega, não pela data em que o prêmio foi sorteado. */
export function demoSummary(records: DemoDelivery[]) {
  const grouped = new Map<string, { day: string; productId: string; name: string; unit: string; delivered: number; posted: number }>();
  for (const record of records) {
    if (record.status !== 'entregue' || !record.delivery || !record.deliveredAt) continue;
    const day = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(record.deliveredAt));
    const item = record.delivery;
    const key = `${day}:${item.produto_id}:${item.unidade}`;
    const row = grouped.get(key) ?? { day, productId: item.produto_id, name: item.produto_nome, unit: item.unidade, delivered: 0, posted: 0 };
    row.delivered += item.quantidade;
    if (record.postedAt) row.posted += item.quantidade;
    grouped.set(key, row);
  }
  return [...grouped.values()];
}
