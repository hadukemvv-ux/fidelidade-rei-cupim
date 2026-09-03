import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

type GanhadorQueryRow = {
  id: string;
  sorteio_id: number;
  cliente_id: string | null;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  tickets_no_sorteio: number | null;
  criado_em: string;
};

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  // ✅ Validar autenticação de admin
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/sorteio/ganhadores', 'Buscando historico de ganhadores', {
      requestId,
    });

    const { data, error } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('id, sorteio_id, cliente_id, nome_cliente, telefone_cliente, tickets_no_sorteio, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      logError('/api/admin/sorteio/ganhadores', error as Error, { requestId });
      return handleApiError(error, '/api/admin/sorteio/ganhadores', requestId);
    }

    const linhas = (data || []) as unknown as GanhadorQueryRow[];
    const sorteioIds = [...new Set(linhas.map((g) => g.sorteio_id).filter(Number.isFinite))];
    const { data: sorteios, error: sorteiosError } = sorteioIds.length
      ? await supabaseAdmin.from('sorteios').select('id_new, titulo').in('id_new', sorteioIds)
      : { data: [], error: null };

    if (sorteiosError) {
      logError('/api/admin/sorteio/ganhadores', sorteiosError as Error, { requestId });
    }

    const titulos = new Map(
      (sorteios || []).map((sorteio) => [Number(sorteio.id_new), sorteio.titulo || 'Sorteio'])
    );

    const ganhadores = linhas.map((g) => ({
      id: g.id,
      sorteio_id: g.sorteio_id,
      cliente_id: g.cliente_id,
      nome: g.nome_cliente || 'Sem nome',
      telefone: g.telefone_cliente || '-',
      sorteio_titulo: titulos.get(Number(g.sorteio_id)) || 'Sorteio',
      created_at: g.criado_em,
      tickets_no_sorteio: g.tickets_no_sorteio || 0,
    }));

    logInfo('/api/admin/sorteio/ganhadores', 'Historico de ganhadores retornado', {
      total: ganhadores.length,
      requestId,
    });

    return successResponse({
      ganhadores,
    });

  } catch (error) {
    logError(
      '/api/admin/sorteio/ganhadores',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/sorteio/ganhadores', requestId);
  }
}
