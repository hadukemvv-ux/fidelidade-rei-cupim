import { deliveryOverdue } from './prizeDeliveryRules.ts';
import type { OperationalRole } from './operationalRoles.ts';

export type DeliveryAction = 'selecionar' | 'entregar' | 'lancar';
export type DeliveryRecord = {
  id: string; operador_id: string | null; modo_teste: boolean;
  status: 'pendente' | 'selecionada' | 'entregue'; versao: number;
  criado_em: string; entregue_em: string | null; lancado_em: string | null;
  produto_id: string | null; produto_nome: string | null; unidade: string | null;
  quantidade: number;
};

/** Fail-closed: uma publicação não liga escrita nem operação comercial. */
export function deliveryLedgerEnabled(env: Record<string, string | undefined>) {
  return env.PRIZE_DELIVERY_LEDGER_ENABLED === 'true';
}

export function canReadDelivery(role: OperationalRole, userId: string, owner: string | null) {
  return role === 'superadmin' || role === 'gestor' || role === 'caixa'
    || (role === 'garcom' && owner === userId);
}

export function canChangeDelivery(role: OperationalRole, userId: string, owner: string | null, action: DeliveryAction) {
  if (action === 'lancar') return role === 'caixa' || role === 'superadmin';
  return role === 'superadmin' || (role === 'garcom' && owner === userId);
}

export function deliveryDay(date: string) {
  const instant = new Date(date);
  if (!Number.isFinite(instant.getTime())) throw new Error('Data inválida.');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
}

/** Só entregas comerciais entram na contagem de saída; seleção não é saída. */
export function deliveryDailySummary(records: DeliveryRecord[]) {
  const grouped = new Map<string, { dia: string; produto_id: string; produto_nome: string; unidade: string; entregues: number; lancados: number }>();
  for (const item of records) {
    if (item.modo_teste || item.status !== 'entregue' || !item.entregue_em
      || !item.produto_id || !item.produto_nome || !item.unidade) continue;
    const dia = deliveryDay(item.entregue_em);
    const key = JSON.stringify([dia, item.produto_id, item.unidade]);
    const row = grouped.get(key) ?? { dia, produto_id: item.produto_id, produto_nome: item.produto_nome, unidade: item.unidade, entregues: 0, lancados: 0 };
    row.entregues += item.quantidade;
    if (item.lancado_em) row.lancados += item.quantidade;
    grouped.set(key, row);
  }
  return [...grouped.values()].sort((a, b) => a.dia.localeCompare(b.dia) || a.produto_id.localeCompare(b.produto_id));
}

export function deliveryAlert(record: DeliveryRecord, now = new Date()) {
  return !record.lancado_em && deliveryOverdue(record.criado_em, now);
}
