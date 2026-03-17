import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/sorteio/zerar', 'Resetando tickets de todos os clientes', {
      requestId,
    });

    const { error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ tickets: 0, atualizado_em: new Date().toISOString() })
      .neq('tickets', 0);

    if (error) {
      logError('/api/admin/sorteio/zerar', error as Error, { requestId });
      return handleApiError(error, '/api/admin/sorteio/zerar', requestId);
    }

    return successResponse({
      resetado: true,
      message: 'Tickets zerados com sucesso',
    });
  } catch (error) {
    logError('/api/admin/sorteio/zerar', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/sorteio/zerar', requestId);
  }
}