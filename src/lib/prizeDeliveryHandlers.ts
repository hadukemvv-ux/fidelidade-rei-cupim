import { z } from 'zod';
import { canChangeDelivery, canReadDelivery, deliveryAlert, deliveryDailySummary, type DeliveryRecord } from './prizeDeliveryLedger.ts';
import type { OperationalRole } from './operationalRoles.ts';

export type DeliveryActor = { userId: string; papel: OperationalRole };
export type DeliveryOption = { entrega_id: string; produto_id: string; nome: string; unidade: string };
type RpcResult = { ok: boolean; motivo?: string; entrega_id?: string; versao?: number };
export type DeliveryStore = {
  list: (actor: DeliveryActor) => Promise<DeliveryRecord[]>;
  options: (deliveryIds: string[]) => Promise<DeliveryOption[]>;
  mutate: (input: { entregaId: string; actor: DeliveryActor; acao: 'selecionar' | 'entregar' | 'lancar'; versao: number; produtoId?: string }) => Promise<RpcResult>;
};
export const DeliveryCommandSchema = z.object({
  entrega_id: z.string().uuid(),
  acao: z.enum(['selecionar', 'entregar', 'lancar']),
  versao: z.number().int().nonnegative().max(2147483646),
  produto_id: z.string().uuid().optional(),
}).strict().refine((input) => input.acao === 'selecionar' ? Boolean(input.produto_id) : !input.produto_id);

const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Store injetável para testar autorização sem tocar no banco real. */
export async function listDeliveries(actor: DeliveryActor, store: DeliveryStore, now = new Date()) {
  try {
    const records = (await store.list(actor)).filter((item) => canReadDelivery(actor.papel, actor.userId, item.operador_id));
    const options = records.length ? await store.options(records.map((item) => item.id)) : [];
    return respond({ entregas: records.map((item) => ({ ...item, alerta_72h: deliveryAlert(item, now), opcoes: options.filter((option) => option.entrega_id === item.id) })), resumo: deliveryDailySummary(records) });
  } catch { return respond({ error: 'Não foi possível consultar as entregas.' }, 503); }
}

export async function changeDelivery(request: Request, actor: DeliveryActor, store: DeliveryStore) {
  const parsed = DeliveryCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return respond({ error: 'Ação de entrega inválida.' }, 400);
  const input = parsed.data;
  // O SQL verifica novamente dono/perfil sob lock. Nunca aceitar ator do corpo.
  if (!canChangeDelivery(actor.papel, actor.userId, actor.userId, input.acao)) {
    return respond({ error: 'Seu perfil não permite esta ação.' }, 403);
  }
  try {
    const data = await store.mutate({ entregaId: input.entrega_id, actor, acao: input.acao, versao: input.versao, produtoId: input.produto_id });
    return respond(data, data.ok ? 200 : 409);
  } catch {
    // Resultado pode ser incerto: não fazer retry cego. Reconsultar versão.
    return respond({ error: 'Resultado não confirmado. Atualize a lista antes de tentar novamente.' }, 503);
  }
}
