import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, logError, handleApiError } from '@/lib/api-utils';

type GanhadorRow = {
  id: number;
  sorteio_id: number;
  cliente_id: number;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  tickets_no_sorteio: number | null;
  criado_em: string;
  sorteios: { titulo: string | null } | null;
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('id, sorteio_id, cliente_id, nome_cliente, telefone_cliente, tickets_no_sorteio, criado_em, sorteios(titulo)')
      .order('criado_em', { ascending: false })
      .limit(20);

    if (error) {
      logError('/api/sorteio/ganhadores', error as Error);
      return handleApiError(error, '/api/sorteio/ganhadores');
    }

    const linhas = (data || []) as unknown as GanhadorRow[];
    const ganhadores = linhas.map((g) => ({
      id: g.id,
      sorteio_id: g.sorteio_id,
      cliente_id: g.cliente_id,
      nome: g.nome_cliente || 'Sem nome',
      telefone: g.telefone_cliente || '-',
      sorteio_titulo: g.sorteios?.titulo || 'Sorteio',
      created_at: g.criado_em,
      tickets_no_sorteio: Number(g.tickets_no_sorteio || 0),
      // Compatibilidade com telas antigas
      nome_cliente: g.nome_cliente || 'Sem nome',
      telefone_cliente: g.telefone_cliente || '-',
      criado_em: g.criado_em,
    }));

    return successResponse({ ganhadores });
  } catch (error) {
    logError('/api/sorteio/ganhadores', error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error, '/api/sorteio/ganhadores');
  }
}
