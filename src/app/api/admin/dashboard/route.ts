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

    // 2. Pontos Distribuídos
    const { data: entradas, error: entradasError } = await supabaseAdmin
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'entrada');

    if (entradasError) {
      logError('/api/admin/dashboard', entradasError as Error, {
        requestId,
      });
      return handleApiError(entradasError, '/api/admin/dashboard', requestId);
    }

    const { data: creditosAtomicos, error: creditosError } = await supabaseAdmin
      .from('fidelidade_transacoes')
      .select('pontos_gerados');

    if (creditosError) {
      logError('/api/admin/dashboard', creditosError as Error, { requestId });
      return handleApiError(creditosError, '/api/admin/dashboard', requestId);
    }

    const { count: clientesAniversario, error: birthdayError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true })
      .eq('aceita_whatsapp_aniversario', true);

    if (birthdayError) {
      logError('/api/admin/dashboard', birthdayError as Error, { requestId });
      return handleApiError(birthdayError, '/api/admin/dashboard', requestId);
    }

    const pontosDistribuidosLegado = entradas?.reduce((s, e) => s + Number(e.valor || 0), 0) || 0;
    const pontosDistribuidosAtomicos = creditosAtomicos?.reduce(
      (s, e) => s + Number(e.pontos_gerados || 0),
      0
    ) || 0;
    const pontosDistribuidos = pontosDistribuidosLegado + pontosDistribuidosAtomicos;

    // 3. Pontos Resgatados
    const { data: saidas, error: saidasError } = await supabaseAdmin
      .from('resgates')
      .select('valor')
      .in('tipo', ['frete', 'pontos', 'produto']);

    if (saidasError) {
      logError('/api/admin/dashboard', saidasError as Error, {
        requestId,
      });
      return handleApiError(saidasError, '/api/admin/dashboard', requestId);
    }

    const pontosResgatados = saidas?.reduce((s, e) => s + Number(e.valor || 0), 0) || 0;

    // 4. Total de Resgates
    const { count: totalResgates, error: resgateCountError } = await supabaseAdmin
      .from('resgates')
      .select('*', { count: 'exact', head: true });

    if (resgateCountError) {
      logError('/api/admin/dashboard', resgateCountError as Error, {
        requestId,
      });
      return handleApiError(resgateCountError, '/api/admin/dashboard', requestId);
    }

    // 5. Cashback Distribuído
    const { data: cashbackData, error: cashbackError } = await supabaseAdmin
      .from('resgates')
      .select('valor')
      .eq('tipo', 'cashback');

    if (cashbackError) {
      logError('/api/admin/dashboard', cashbackError as Error, {
        requestId,
      });
      return handleApiError(cashbackError, '/api/admin/dashboard', requestId);
    }

    const cashbackDistribuido = cashbackData?.reduce((s, e) => s + (e.valor || 0), 0) || 0;

    const dashboardData = {
      totalClientes: totalClientes || 0,
      pontosDistribuidos,
      pontosResgatados,
      saldoPontosAtivos: pontosDistribuidos - pontosResgatados,
      totalResgates: totalResgates || 0,
      cashbackDistribuido,
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
