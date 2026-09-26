type Row = Record<string, unknown>;

function object(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
}

function safeText(value: unknown, max = 70): string | null {
  if (typeof value === 'string' && value.length <= max) return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function safeDate(value: unknown): string | null {
  const text = safeText(value, 40);
  return text && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text) ? text : null;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

export function classifyDeliveryChannel(sale: Row) {
  const partner = object(sale.partner_sale);
  const name = safeText(partner?.desc_store_partner)?.toLowerCase() || '';
  if (/ifood|99\s*food|rappi|aiqfome|keeta/.test(name)) return 'marketplace';
  if (/site\s*delivery|saipos/.test(name)) return 'proprio_identificado';
  return partner ? 'parceiro_a_verificar' : 'sem_parceiro_informado';
}

export function summarizeDelivery(sale: Row, history?: Row) {
  const delivery = object(sale.delivery);
  const partner = object(sale.partner_sale);
  const events = Array.isArray(history?.histories) ? history.histories : [];

  return {
    id_sale: safeText(sale.id_sale, 30),
    sale_number: safeText(sale.sale_number, 30),
    created_at: safeDate(sale.created_at),
    updated_at: safeDate(sale.updated_at),
    canceled: safeText(sale.canceled, 8),
    total_amount: safeNumber(sale.total_amount),
    channel_class: classifyDeliveryChannel(sale),
    partner_name: safeText(partner?.desc_store_partner),
    delivery_time: safeNumber(delivery?.delivery_time),
    delivery_by: safeText(delivery?.delivery_by, 20),
    statuses: events.slice(0, 30).map((event) => {
      const row = object(event);
      return {
        status: safeText(row?.desc_store_sale_status),
        at: safeDate(row?.created_at),
        duration_seconds: safeNumber(row?.duration_time_seconds),
      };
    }),
    history_available: Boolean(history),
  };
}
