import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  // ✅ Validar autenticação de admin
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/financeiro/overview', 'Buscando dados financeiros', { requestId });

    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('total_gasto, qtd_pedidos, updated_at');

    if (error) {
      logError('/api/financeiro/overview', error as Error, { requestId });
      return handleApiError(error, '/api/financeiro/overview', requestId);
    }

    // Se não há dados, retornar zeros
    if (!clientes || clientes.length === 0) {
      return successResponse({
        faturamento_total: 0,
        faturamento_medio: 0,
        ticket_medio: 0,
        total_pedidos: 0,
        clientes_unicos: 0,
        novos_clientes_30dias: 0,
        clientes_recorrentes: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // ===== CALCULAR MÉTRICAS =====

    // Faturamento total
    const faturamento_total = clientes.reduce(
      (s, c) => s + Number(c.total_gasto || 0),
      0
    );

    // Total de pedidos
    const total_pedidos = clientes.reduce(
      (s, c) => s + Number(c.qtd_pedidos || 0),
      0
    );

    // Ticket médio
    const ticket_medio = total_pedidos > 0 ? faturamento_total / total_pedidos : 0;

    // Faturamento médio por cliente
    const faturamento_medio = faturamento_total / clientes.length;

    // Clientes únicos
    const clientes_unicos = clientes.length;

    // Novos clientes nos últimos 30 dias
    const limite30Dias = new Date();
    limite30Dias.setDate(limite30Dias.getDate() - 30);

    const novos_clientes_30dias = clientes.filter((c) => {
      const dataUpdate = new Date(c.updated_at || 0);
      return dataUpdate >= limite30Dias;
    }).length;

    // Clientes recorrentes (com mais de 1 pedido)
    const clientes_recorrentes = clientes.filter(
      (c) => Number(c.qtd_pedidos || 0) > 1
    ).length;

    logInfo('/api/financeiro/overview', 'Dados financeiros obtidos com sucesso', {
      faturamento_total: faturamento_total.toFixed(2),
      clientes_unicos,
      requestId,
    });

    return successResponse({
      faturamento_total: parseFloat(faturamento_total.toFixed(2)),
      faturamento_medio: parseFloat(faturamento_medio.toFixed(2)),
      ticket_medio: parseFloat(ticket_medio.toFixed(2)),
      total_pedidos,
      clientes_unicos,
      clientes_recorrentes,
      novos_clientes_30dias,
      taxa_recorrencia: parseFloat(
        ((clientes_recorrentes / clientes_unicos) * 100).toFixed(2)
      ),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError('/api/financeiro/overview', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/financeiro/overview', requestId);
  }
}