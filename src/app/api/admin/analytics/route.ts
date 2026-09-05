import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import { isOtpEnabled } from '@/lib/whatsappOtp';
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

  const authError = await validateAdminAuth(request, new URL(request.url));
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
      inicio = new Date(`${periodo.inicio}T00:00:00-03:00`);
      hoje.setTime(new Date(`${periodo.fim}T23:59:59.999-03:00`).getTime());
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(hoje.getTime()) || inicio > hoje) {
        return validationErrorResponse('Período inválido.');
      }
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

    const { data: pontosEntradaAtomica, error: entradaAtomicaError } = await supabaseAdmin
      .from('fidelidade_transacoes')
      .select('pontos_gerados, ocorreu_em')
      .gte('ocorreu_em', inicioISO)
      .lte('ocorreu_em', fimISO);

    if (entradaAtomicaError) {
      logError('/api/admin/analytics', entradaAtomicaError as Error, { requestId });
      return handleApiError(entradaAtomicaError, '/api/admin/analytics', requestId);
    }

    const { data: pontosSaida, error: saidaError } = await supabaseAdmin
      .from('resgates')
      .select('valor, criado_em')
      .in('tipo', ['frete', 'pontos', 'produto'])
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    if (saidaError) {
      logError('/api/admin/analytics', saidaError as Error, { requestId });
      return handleApiError(saidaError, '/api/admin/analytics', requestId);
    }

    const { data: resgatesPeriodo, error: resgateError } = await supabaseAdmin
      .from('resgates')
      .select('id, criado_em, tipo, produto_id, premio_nome, valor')
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

    const [baseTotal, contasComPin, registrosTeste, verificacoesConcluidas] = await Promise.all([
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).like('pin_hash', 'scrypt$%'),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).or('nome.ilike.Cliente Teste %,email.ilike.%@teste.com,email.ilike.%@example.com'),
      supabaseAdmin.from('otp_verificacoes').select('id', { count: 'exact', head: true }).eq('status', 'verificado'),
    ]);

    const countError = baseTotal.error || contasComPin.error || registrosTeste.error || verificacoesConcluidas.error;
    if (countError) {
      logError('/api/admin/analytics', countError as Error, { requestId });
      return handleApiError(countError, '/api/admin/analytics', requestId);
    }

    const convidadosBeta = (process.env.WHATSAPP_OTP_BETA_PHONES || '')
      .split(',')
      .map((phone) => phone.trim())
      .filter(Boolean).length;

    return successResponse({
      periodo: { inicio: inicioISO, fim: fimISO },
      clientesPeriodo: clientesPeriodo || [],
      pontosEntrada: [
        ...(pontosEntrada || []),
        ...(pontosEntradaAtomica || []).map((item) => ({
          valor: Number(item.pontos_gerados || 0),
          criado_em: item.ocorreu_em,
        })),
      ],
      pontosSaida: pontosSaida || [],
      resgatesPeriodo: resgatesPeriodo || [],
      giros: giros || [],
      base: {
        total: baseTotal.count || 0,
        cadastrosSeguros: contasComPin.count || 0,
        registrosTeste: registrosTeste.count || 0,
      },
      whatsapp: {
        otpAtivo: isOtpEnabled(),
        convidadosBeta,
        verificacoesConcluidas: verificacoesConcluidas.count || 0,
      },
    });
  } catch (error) {
    logError('/api/admin/analytics', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/analytics', requestId);
  }
}
