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
    logInfo('/api/admin/logs', 'Listando logs de cron', { requestId });

    const { data, error } = await supabaseAdmin
      .from('saipos_cron_logs')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      logError('/api/admin/logs', error as Error, { requestId });
      return handleApiError(error, '/api/admin/logs', requestId);
    }

    return successResponse({ logs: data || [] });
  } catch (error) {
    logError('/api/admin/logs', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/logs', requestId);
  }
}