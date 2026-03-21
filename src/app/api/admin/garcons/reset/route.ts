import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  // ✅ Validar autenticação de admin
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/garcons/reset', 'Iniciando reset de contadores de garçons', { requestId });

    // Zera a coluna 'total_giros' de TODOS os garçons
    // O histórico detalhado continua salvo
    const { error, data } = await supabaseAdmin
      .from('garcons')
      .update({ total_giros: 0, atualizado_em: new Date().toISOString() })
      .neq('id', 0);

    if (error) {
      logError('/api/admin/garcons/reset', error as Error, { requestId });
      return handleApiError(error, '/api/admin/garcons/reset', requestId);
    }

    logInfo('/api/admin/garcons/reset', 'Contadores de garçons zerados com sucesso', {
      requestId,
    });

    return successResponse({
      message: 'Contadores de garçons zerados com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('/api/admin/garcons/reset', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/garcons/reset', requestId);
  }
}