import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import {
  successResponse,
  errorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return errorResponse('CRON_SECRET nao configurado no servidor', 'server_error', 500, requestId);
    }

    const origin = new URL(request.url).origin;

    logInfo('/api/admin/sincronizar-hoje', 'Disparando sincronizacao manual do cron Saipos', {
      origin,
      requestId,
    });

    const res = await fetch(`${origin}/api/cron/saipos`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: 'no-store',
    });

    const dados = await res.json();

    if (!res.ok) {
      return errorResponse(
        dados?.error || dados?.erro || 'Falha ao sincronizar dados do Saipos',
        'server_error',
        res.status,
        requestId
      );
    }

    return successResponse({
      sincronizado: true,
      retorno: dados?.data ?? dados,
    });
  } catch (error) {
    logError('/api/admin/sincronizar-hoje', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/sincronizar-hoje', requestId);
  }
}