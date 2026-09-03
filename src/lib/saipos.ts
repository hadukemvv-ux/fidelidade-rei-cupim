const SAIPOS_URL = 'https://data.saipos.io/v1/search_sales';

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

type BuscarVendasOptions = {
  inicio: string;
  fim: string;
  limit?: number;
  offset?: number;
  token?: string;
  storeId?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

type BuscarTodasVendasOptions = Omit<BuscarVendasOptions, 'limit' | 'offset'> & {
  pageSize?: number;
  maxPages?: number;
};

export type VendaSaipos = {
  id_sale?: unknown;
  canceled?: unknown;
  total_amount?: unknown;
  customer?: {
    cpf_cnpj?: unknown;
    phone?: unknown;
    name?: unknown;
  };
  customer_cpf?: unknown;
  customer_phone?: unknown;
  telefone?: unknown;
  shift_date?: unknown;
  created_at?: unknown;
};

export class SaiposApiError extends Error {
  readonly status: number;
  readonly detalhes: string;
  readonly tentativas: number;
  readonly retentavel: boolean;

  constructor(
    message: string,
    status: number,
    detalhes: string,
    tentativas: number,
    retentavel = false
  ) {
    super(message);
    this.name = 'SaiposApiError';
    this.status = status;
    this.detalhes = detalhes;
    this.tentativas = tentativas;
    this.retentavel = retentavel;
  }
}

function esperar(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function temErroTransitorioNoCorpo(body: string) {
  return body.includes('PGRST003') || body.toLowerCase().includes('connection pool');
}

/**
 * Consulta somente-leitura à Saipos com retentativas curtas para indisponibilidade
 * temporária. Falhas de autenticação e respostas inválidas não são repetidas.
 */
export async function buscarVendasSaipos({
  inicio,
  fim,
  limit = 200,
  offset = 0,
  token = process.env.SAIPOS_TOKEN,
  storeId = process.env.SAIPOS_ID || '62039',
  fetchImpl = fetch,
  sleep = esperar,
  timeoutMs = 10_000,
}: BuscarVendasOptions): Promise<VendaSaipos[]> {
  if (!token) throw new Error('Token Saipos não configurado.');

  const params = new URLSearchParams({
    p_date_column_filter: 'shift_date',
    p_filter_date_start: inicio,
    p_filter_date_end: fim,
    p_limit: String(limit),
    p_offset: String(offset),
    p_store: storeId,
  });

  const maxTentativas = 3;
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${SAIPOS_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: controller.signal,
      });

      const body = await response.text();

      if (response.ok) {
        const dados: unknown = JSON.parse(body);
        if (!Array.isArray(dados)) {
          throw new SaiposApiError(
            'A Saipos retornou um formato inesperado.',
            502,
            'Resposta não contém uma lista de vendas.',
            tentativa
          );
        }
        return dados as VendaSaipos[];
      }

      const transitorio = TRANSIENT_STATUS.has(response.status) || temErroTransitorioNoCorpo(body);
      const erro = new SaiposApiError(
        `Erro Saipos: ${response.status}`,
        response.status,
        body,
        tentativa,
        transitorio
      );

      if (!transitorio || tentativa === maxTentativas) throw erro;
      ultimoErro = erro;
    } catch (error) {
      if (error instanceof SaiposApiError &&
          (!error.retentavel || tentativa === maxTentativas)) {
        throw error;
      }

      ultimoErro = error;
      if (tentativa === maxTentativas) {
        throw new SaiposApiError(
          'A Saipos não respondeu após 3 tentativas.',
          503,
          error instanceof Error ? error.message : String(error),
          tentativa
        );
      }
    } finally {
      clearTimeout(timeout);
    }

    await sleep(tentativa === 1 ? 500 : 1_500);
  }

  throw ultimoErro;
}

/** Busca todas as páginas de um período, com um teto defensivo contra loops. */
export async function buscarTodasVendasSaipos({
  pageSize = 200,
  maxPages = 50,
  ...options
}: BuscarTodasVendasOptions): Promise<VendaSaipos[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error('Tamanho de página Saipos inválido.');
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
    throw new Error('Limite de páginas Saipos inválido.');
  }

  const vendas: VendaSaipos[] = [];

  for (let pagina = 0; pagina < maxPages; pagina += 1) {
    const lote = await buscarVendasSaipos({
      ...options,
      limit: pageSize,
      offset: pagina * pageSize,
    });
    vendas.push(...lote);

    if (lote.length < pageSize) return vendas;
  }

  throw new SaiposApiError(
    `A consulta Saipos excedeu o limite seguro de ${maxPages * pageSize} vendas.`,
    502,
    'Paginação interrompida para evitar execução sem limite.',
    1
  );
}

const FUSO_SAO_PAULO = 'America/Sao_Paulo';

function dataCivilSaoPaulo(agora: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_SAO_PAULO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return {
    ano: Number(valor('year')),
    mes: Number(valor('month')),
    dia: Number(valor('day')),
  };
}

/**
 * Gera uma janela de dias civis de São Paulo. O Brasil não adota horário de
 * verão desde 2019, portanto meia-noite local corresponde a 03:00 UTC.
 */
export function periodoUltimosDiasSaoPaulo(dias: number, agora = new Date()) {
  if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
    throw new Error('O período deve ter entre 1 e 90 dias.');
  }

  const { ano, mes, dia } = dataCivilSaoPaulo(agora);
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, dia - (dias - 1), 3, 0, 0, 0)).toISOString(),
    fim: new Date(Date.UTC(ano, mes - 1, dia + 1, 3, 0, 0, 0) - 1).toISOString(),
  };
}

export function periodoDiaSaoPaulo(dia: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    throw new Error('Data inválida. Use YYYY-MM-DD.');
  }

  const [ano, mes, data] = dia.split('-').map(Number);
  const meioDia = new Date(Date.UTC(ano, mes - 1, data, 15));
  const civil = dataCivilSaoPaulo(meioDia);
  if (civil.ano !== ano || civil.mes !== mes || civil.dia !== data) {
    throw new Error('Data inválida. Use uma data existente.');
  }

  return {
    inicio: new Date(Date.UTC(ano, mes - 1, data, 3, 0, 0, 0)).toISOString(),
    fim: new Date(Date.UTC(ano, mes - 1, data + 1, 3, 0, 0, 0) - 1).toISOString(),
  };
}
