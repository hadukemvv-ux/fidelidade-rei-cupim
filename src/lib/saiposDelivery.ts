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
  // desc_store_partner é o nome da loja dentro do parceiro, não o canal.
  // Sem um identificador mapeado, a origem nunca deve ser inferida daqui.
  return partner ? 'parceiro_informado_canal_desconhecido' : 'sem_parceiro_informado';
}

export function summarizeDelivery(sale: Row, history?: Row) {
  const delivery = object(sale.delivery);
  const partner = object(sale.partner_sale);
  const events = Array.isArray(history?.histories) ? history.histories : [];
  const statuses = events.slice(0, 30).map((event) => {
    const row = object(event);
    return {
      status: safeText(row?.desc_store_sale_status),
      at: safeDate(row?.created_at),
      duration_seconds: safeNumber(row?.duration_time_seconds),
    };
  });
  const latest = statuses.filter((status) => status.at).sort((a, b) => (b.at || '').localeCompare(a.at || ''))[0];

  return {
    id_sale: safeText(sale.id_sale, 30),
    sale_number: safeText(sale.sale_number, 30),
    created_at: safeDate(sale.created_at),
    updated_at: safeDate(sale.updated_at),
    canceled: safeText(sale.canceled, 8),
    total_amount: safeNumber(sale.total_amount),
    channel_class: classifyDeliveryChannel(sale),
    partner_name: safeText(partner?.desc_store_partner),
    delivery_time: safeNumber(delivery?.delivery_time) && Number(delivery?.delivery_time) > 0
      ? Number(delivery?.delivery_time) : null,
    delivery_by: safeText(delivery?.delivery_by, 20),
    statuses,
    latest_status: latest?.status || null,
    history_available: Boolean(history),
  };
}
