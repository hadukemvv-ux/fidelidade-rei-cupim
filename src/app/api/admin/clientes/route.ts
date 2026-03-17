import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { successResponse, errorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  
  // Validar admin auth
  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/clientes', 'Listando todos clientes', {
      requestId,
    });

    const { data, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone, nome, email, nivel, pontos, cashback, tickets, total_gasto, qtd_pedidos, ultima_compra, bloqueado')
      .order('ultima_compra', { ascending: false });

    if (error) {
      logError('/api/admin/clientes', error as Error, {
        requestId,
      });
      return handleApiError(error, '/api/admin/clientes', requestId);
    }

    const clientes = data || [];

    logInfo('/api/admin/clientes', `Listados ${clientes.length} clientes`, {
      requestId,
    });

    return successResponse({
      quantidade: clientes.length,
      clientes,
    });

  } catch (error) {
    logError('/api/admin/clientes', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/clientes', requestId);
  }
}