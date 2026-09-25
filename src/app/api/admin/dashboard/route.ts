import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  // ✅ Validar autenticação de admin
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/dashboard', 'Buscando dados de dashboard', {
      requestId,
    });

    // 1. Total de Clientes
    const { count: totalClientes, error: clientError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true });

    if (clientError) {
      logError('/api/admin/dashboard', clientError as Error, {
        requestId,
      });
      return handleApiError(clientError, '/api/admin/dashboard', requestId);
    }

    // 2. Somar os saldos operacionais, incluindo pontos de abertura importados.
    const { data: saldoPontosAtivos, error: saldoError } = await supabaseAdmin
      .rpc('saldo_pontos_cadastrados');

    if (saldoError) {
      logError('/api/admin/dashboard', saldoError as Error, { requestId });
      return handleApiError(saldoError, '/api/admin/dashboard', requestId);
    }

    const { count: clientesAniversario, error: birthdayError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true })
      .eq('aceita_whatsapp_aniversario', true);

    if (birthdayError) {
      logError('/api/admin/dashboard', birthdayError as Error, { requestId });
      return handleApiError(birthdayError, '/api/admin/dashboard', requestId);
    }

    // 3. Total de Resgates
    const { count: totalResgates, error: resgateCountError } = await supabaseAdmin
      .from('resgates')
      .select('*', { count: 'exact', head: true });

    if (resgateCountError) {
      logError('/api/admin/dashboard', resgateCountError as Error, {
        requestId,
      });
      return handleApiError(resgateCountError, '/api/admin/dashboard', requestId);
    }

    const dashboardData = {
      totalClientes: totalClientes || 0,
      saldoPontosAtivos: Number(saldoPontosAtivos),
      totalResgates: totalResgates || 0,
      clientesAniversario: clientesAniversario || 0,
      timestamp: new Date().toISOString(),
    };

    logInfo('/api/admin/dashboard', 'Dashboard dados obtidos com sucesso', {
      totalClientes: dashboardData.totalClientes,
      requestId,
    });

    return successResponse(dashboardData);

  } catch (error) {
    logError('/api/admin/dashboard', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/dashboard', requestId);
  }
}
