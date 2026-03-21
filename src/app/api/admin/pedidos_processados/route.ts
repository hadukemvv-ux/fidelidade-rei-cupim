import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/pedidos_processados', 'Listando pedidos processados Saipos', {
      requestId,
    });

    const { data, error } = await supabaseAdmin
      .from('saipos_pedidos_processados')
      .select('*')
      .order('processado_em', { ascending: false })
      .limit(300);

    if (error) {
      logError('/api/admin/pedidos_processados', error as Error, { requestId });
      return handleApiError(error, '/api/admin/pedidos_processados', requestId);
    }

    return successResponse({ pedidos: data || [] });
  } catch (error) {
    logError('/api/admin/pedidos_processados', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/pedidos_processados', requestId);
  }
}