import { SaiposApiError } from './saipos.ts';

type HistoryRow = Record<string, unknown> & { id_sale?: unknown };

type Options = {
  inicio: string;
  fim: string;
  maxPages?: number;
  token?: string;
  fetchImpl?: typeof fetch;
};

export async function buscarHistoricosStatusSaipos({
  inicio, fim, maxPages = 4,
  token = process.env.SAIPOS_DATA_API_TOKEN,
  fetchImpl = fetch,
}: Options): Promise<{ rows: HistoryRow[]; complete: boolean }> {
  if (!token) throw new Error('Token da API de Dados Saipos não configurado.');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) throw new Error('Paginação inválida.');

  const rows: HistoryRow[] = [];
  const pageSize = 500;
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      p_date_column_filter: 'created_at',
      p_filter_date_start: inicio,
      p_filter_date_end: fim,
      p_limit: String(pageSize),
      p_offset: String(page * pageSize),
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetchImpl(`https://data.saipos.io/v1/sales_status_histories?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new SaiposApiError('Falha na consulta do histórico Saipos.', response.status, '', 1);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new SaiposApiError('Histórico Saipos em formato inesperado.', 502, '', 1);
      rows.push(...data.filter((row): row is HistoryRow => Boolean(row && typeof row === 'object' && !Array.isArray(row))));
      if (data.length < pageSize) return { rows, complete: true };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { rows, complete: false };
}
