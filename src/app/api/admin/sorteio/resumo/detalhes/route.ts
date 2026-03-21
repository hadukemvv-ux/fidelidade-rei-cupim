import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

type SorteioLogRow = {
  cliente_id: number;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  tickets: number | null;
  chance_percentual: number | null;
};

const ResumoDetalhesQuerySchema = z.object({
  sorteio_id: z.coerce.number().int().positive('sorteio_id deve ser um numero valido'),
});

type ResumoDetalhesQueryInput = z.infer<typeof ResumoDetalhesQuerySchema>;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const validacao = validarDados<ResumoDetalhesQueryInput>(ResumoDetalhesQuerySchema, {
      sorteio_id: searchParams.get('sorteio_id'),
    });

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { sorteio_id: sorteioIdNum } = validacao.data;

    logInfo('/api/admin/sorteio/resumo/detalhes', 'Buscando detalhes completos do sorteio', {
      sorteio_id: sorteioIdNum,
      requestId,
    });

    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('sorteios_logs')
      .select('cliente_id, nome_cliente, telefone_cliente, tickets, chance_percentual')
      .eq('sorteio_id', sorteioIdNum)
      .order('tickets', { ascending: false });

    if (logsErr) {
      logError('/api/admin/sorteio/resumo/detalhes', logsErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(logsErr, '/api/admin/sorteio/resumo/detalhes', requestId);
    }

    if (!logs || logs.length === 0) {
      return errorResponse('Nenhum log encontrado para este sorteio', 'not_found', 404, requestId);
    }

    const { data: ganhador, error: ganhadorErr } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('cliente_id')
      .eq('sorteio_id', sorteioIdNum)
      .limit(1)
      .maybeSingle();

    if (ganhadorErr) {
      logError('/api/admin/sorteio/resumo/detalhes', ganhadorErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(ganhadorErr, '/api/admin/sorteio/resumo/detalhes', requestId);
    }

    const logsTipados = logs as unknown as SorteioLogRow[];
    const logsFormatados = logsTipados.map((log, index) => ({
      posicao: index + 1,
      cliente_id: log.cliente_id,
      nome_cliente: log.nome_cliente,
      telefone_cliente: log.telefone_cliente,
      tickets: Number(log.tickets) || 0,
      chance_percentual: Number(log.chance_percentual) || 0,
      foi_ganhador: ganhador?.cliente_id === log.cliente_id,
    }));

    const totalTickets = logsFormatados.reduce((sum, log) => sum + log.tickets, 0);

    logInfo('/api/admin/sorteio/resumo/detalhes', 'Detalhes completos retornados com sucesso', {
      sorteio_id: sorteioIdNum,
      total_participantes: logsFormatados.length,
      total_tickets: totalTickets,
      requestId,
    });

    return successResponse({
      sorteio_id: sorteioIdNum,
      total_participantes: logsFormatados.length,
      total_tickets: totalTickets,
      logs: logsFormatados,
    });
  } catch (error) {
    logError(
      '/api/admin/sorteio/resumo/detalhes',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/sorteio/resumo/detalhes', requestId);
  }
}