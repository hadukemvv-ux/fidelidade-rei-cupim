import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  successResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const GarcomLogsQuerySchema = z.object({
  id: z.coerce.number().int().positive('ID do garcom invalido'),
});

type GarcomLogsQueryInput = z.infer<typeof GarcomLogsQuerySchema>;

// /api/admin/garcons/logs?id=1
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const validacao = validarDados<GarcomLogsQueryInput>(GarcomLogsQuerySchema, {
      id: searchParams.get('id'),
    });

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { id } = validacao.data;

    logInfo('/api/admin/garcons/logs', 'Buscando logs do garcom', {
      garcom_id: id,
      requestId,
    });

    // Buscar logs completos do garcom
    const { data: logs, error } = await supabaseAdmin
      .from('garcons_logs')
      .select('id, garcom_id, premio, telefone_cliente, ip, user_agent, score, suspeito, motivo, criado_em')
      .eq('garcom_id', id)
      .order('criado_em', { ascending: false });

    if (error) {
      logError('/api/admin/garcons/logs', error as Error, {
        garcom_id: id,
        requestId,
      });
      return handleApiError(error, '/api/admin/garcons/logs', requestId);
    }

    const resultado = logs || [];

    logInfo('/api/admin/garcons/logs', 'Logs do garcom retornados com sucesso', {
      garcom_id: id,
      total: resultado.length,
      requestId,
    });

    return successResponse({ logs: resultado });
  } catch (error) {
    logError('/api/admin/garcons/logs', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/garcons/logs', requestId);
  }
}