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

const AnalyticsPeriodoSchema = z.object({
  periodo: z
    .union([
      z.enum(['7d', '30d', '90d']),
      z.object({
        inicio: z.string().min(10),
        fim: z.string().min(10),
      }),
    ])
    .optional(),
});

type AnalyticsPeriodoInput = z.infer<typeof AnalyticsPeriodoSchema>;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<AnalyticsPeriodoInput>(AnalyticsPeriodoSchema, body || {});

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { periodo } = validacao.data;

    const hoje = new Date();
    let inicio = new Date();

    if (periodo === '7d') inicio.setDate(hoje.getDate() - 7);
    if (periodo === '30d') inicio.setDate(hoje.getDate() - 30);
    if (periodo === '90d') inicio.setDate(hoje.getDate() - 90);

    if (periodo && typeof periodo === 'object' && periodo.inicio && periodo.fim) {
      inicio = new Date(periodo.inicio);
      hoje.setTime(new Date(periodo.fim).getTime());
    }

    const inicioISO = inicio.toISOString();
    const fimISO = hoje.toISOString();

    logInfo('/api/admin/analytics', 'Calculando analytics administrativo', {
      periodo_inicio: inicioISO,
      periodo_fim: fimISO,
      requestId,
    });

    const { data: clientesPeriodo, error: clientesError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, atualizado_em')
      .gte('atualizado_em', inicioISO)
      .lte('atualizado_em', fimISO);

    if (clientesError) {
      logError('/api/admin/analytics', clientesError as Error, { requestId });
      return handleApiError(clientesError, '/api/admin/analytics', requestId);
    }

    const { data: pontosEntrada, error: entradaError } = await supabaseAdmin
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'entrada')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    if (entradaError) {
      logError('/api/admin/analytics', entradaError as Error, { requestId });
      return handleApiError(entradaError, '/api/admin/analytics', requestId);
    }

    const { data: pontosSaida, error: saidaError } = await supabaseAdmin
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'saida')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    if (saidaError) {
      logError('/api/admin/analytics', saidaError as Error, { requestId });
      return handleApiError(saidaError, '/api/admin/analytics', requestId);
    }

    const { data: resgatesPeriodo, error: resgateError } = await supabaseAdmin
      .from('resgates')
      .select('id, criado_em, tipo, produto_id, premio_nome')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    if (resgateError) {
      logError('/api/admin/analytics', resgateError as Error, { requestId });
      return handleApiError(resgateError, '/api/admin/analytics', requestId);
    }

    const { data: giros, error: girosError } = await supabaseAdmin
      .from('historico_roleta')
      .select('id, premio_nome, data_hora')
      .gte('data_hora', inicioISO)
      .lte('data_hora', fimISO);

    if (girosError) {
      logError('/api/admin/analytics', girosError as Error, { requestId });
      return handleApiError(girosError, '/api/admin/analytics', requestId);
    }

    return successResponse({
      periodo: { inicio: inicioISO, fim: fimISO },
      clientesPeriodo: clientesPeriodo || [],
      pontosEntrada: pontosEntrada || [],
      pontosSaida: pontosSaida || [],
      resgatesPeriodo: resgatesPeriodo || [],
      giros: giros || [],
    });
  } catch (error) {
    logError('/api/admin/analytics', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/analytics', requestId);
  }
}