import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

type GanhadorQueryRow = {
  id: number;
  sorteio_id: number;
  cliente_id: number | null;
  nome: string | null;
  telefone: string | null;
  tickets_no_sorteio: number | null;
  created_at: string;
  sorteios: { titulo: string | null } | null;
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
      .select(`
        id, 
        sorteio_id, 
        cliente_id,
        nome_cliente as nome,
        telefone_cliente as telefone,
        tickets_no_sorteio,
        criado_em as created_at,
        sorteios(titulo)
      `)
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      logError('/api/admin/sorteio/ganhadores', error as Error, { requestId });
      return handleApiError(error, '/api/admin/sorteio/ganhadores', requestId);
    }

    // Transform response to match frontend expectations
    const linhas = (data || []) as unknown as GanhadorQueryRow[];
    const ganhadores = linhas.map((g) => ({
      id: g.id,
      sorteio_id: g.sorteio_id,
      cliente_id: g.cliente_id,
      nome: g.nome || 'Sem nome',
      telefone: g.telefone || '-',
      sorteio_titulo: g.sorteios?.titulo || 'Sorteio',
      created_at: g.created_at,
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