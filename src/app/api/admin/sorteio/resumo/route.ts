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

type SorteioRow = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  data_sorteio: string | null;
  modo: string | null;
  status: string | null;
};

type GanhadorRow = {
  id: number;
  cliente_id: number;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  tickets_no_sorteio: number | null;
  criado_em: string;
};

type SorteioLogRow = {
  cliente_id: number;
  nome_cliente: string | null;
  telefone_cliente: string | null;
  tickets: number | null;
  chance_percentual: number | null;
};

type SorteioEventoRow = {
  tipo: string;
  descricao: string | null;
  detalhes: unknown;
  criado_em: string;
};

const ResumoQuerySchema = z.object({
  sorteio_id: z.coerce.number().int().positive('sorteio_id deve ser um numero valido'),
});

type ResumoQueryInput = z.infer<typeof ResumoQuerySchema>;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const validacao = validarDados<ResumoQueryInput>(ResumoQuerySchema, {
      sorteio_id: searchParams.get('sorteio_id'),
    });

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { sorteio_id: sorteioIdNum } = validacao.data;

    logInfo('/api/admin/sorteio/resumo', 'Buscando resumo de sorteio', {
      sorteio_id: sorteioIdNum,
      requestId,
    });

    const { data: sorteio, error: sorteioErr } = await supabaseAdmin
      .from('sorteios')
      .select('id, titulo, descricao, data_sorteio, modo, status')
      .eq('id', sorteioIdNum)
      .limit(1)
      .maybeSingle();

    if (sorteioErr) {
      logError('/api/admin/sorteio/resumo', sorteioErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(sorteioErr, '/api/admin/sorteio/resumo', requestId);
    }

    if (!sorteio) {
      return errorResponse('Sorteio nao encontrado', 'not_found', 404, requestId);
    }

    const { data: ganhador, error: ganhadorErr } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('id, cliente_id, nome_cliente, telefone_cliente, tickets_no_sorteio, criado_em')
      .eq('sorteio_id', sorteioIdNum)
      .limit(1)
      .maybeSingle();

    if (ganhadorErr) {
      logError('/api/admin/sorteio/resumo', ganhadorErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(ganhadorErr, '/api/admin/sorteio/resumo', requestId);
    }

    if (!ganhador) {
      return errorResponse('Este sorteio ainda nao foi realizado', 'not_found', 404, requestId);
    }

    const { data: logsCompletos, error: logsErr } = await supabaseAdmin
      .from('sorteios_logs')
      .select('cliente_id, nome_cliente, telefone_cliente, tickets, chance_percentual')
      .eq('sorteio_id', sorteioIdNum)
      .order('tickets', { ascending: false });

    if (logsErr) {
      logError('/api/admin/sorteio/resumo', logsErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(logsErr, '/api/admin/sorteio/resumo', requestId);
    }

    const { data: eventosCompletos, error: eventosErr } = await supabaseAdmin
      .from('sorteios_eventos')
      .select('tipo, descricao, detalhes, criado_em')
      .eq('sorteio_id', sorteioIdNum)
      .order('criado_em', { ascending: true });

    if (eventosErr) {
      logError('/api/admin/sorteio/resumo', eventosErr as Error, {
        sorteio_id: sorteioIdNum,
        requestId,
      });
      return handleApiError(eventosErr, '/api/admin/sorteio/resumo', requestId);
    }

    const sorteioData = sorteio as SorteioRow;
    const ganhadorData = ganhador as GanhadorRow;
    const logsData = (logsCompletos || []) as unknown as SorteioLogRow[];
    const eventosData = (eventosCompletos || []) as unknown as SorteioEventoRow[];

    const top10Logs = logsData.slice(0, 10);
    const totalParticipantes = logsData.length;

    const eventoInicio = eventosData.find((e) => e.tipo === 'inicio');
    const eventoGanhador = eventosData.find((e) => e.tipo === 'ganhador_definido');
    const eventoFim = eventosData.find((e) => e.tipo === 'fim');

    const detalhesGanhador =
      eventoGanhador && typeof eventoGanhador.detalhes === 'object' && eventoGanhador.detalhes !== null
        ? (eventoGanhador.detalhes as Record<string, unknown>)
        : null;

    const hashAuditoria =
      detalhesGanhador && typeof detalhesGanhador.hash_auditoria === 'string'
        ? detalhesGanhador.hash_auditoria
        : null;

    const timestampGanhador =
      detalhesGanhador && typeof detalhesGanhador.timestamp === 'string'
        ? detalhesGanhador.timestamp
        : ganhadorData.criado_em;

    const totalTickets = logsData.reduce((sum, log) => sum + (Number(log.tickets) || 0), 0);
    const chanceGanhador =
      logsData.find((log) => log.cliente_id === ganhadorData.cliente_id)?.chance_percentual || 0;

    const top10 = top10Logs.map((log, index) => ({
      posicao: index + 1,
      cliente_id: log.cliente_id,
      nome_cliente: log.nome_cliente,
      telefone_cliente: log.telefone_cliente,
      tickets: Number(log.tickets) || 0,
      chance_percentual: Number(log.chance_percentual) || 0,
    }));

    const sorteioResumo = {
      sorteio: {
        id: sorteioData.id,
        titulo: sorteioData.titulo,
        descricao: sorteioData.descricao,
        data_sorteio: sorteioData.data_sorteio,
        modo: sorteioData.modo,
        status: sorteioData.status,
      },
      ganhador: {
        id: ganhadorData.id,
        cliente_id: ganhadorData.cliente_id,
        nome: ganhadorData.nome_cliente,
        telefone: ganhadorData.telefone_cliente,
        tickets: Number(ganhadorData.tickets_no_sorteio) || 0,
        chance_percentual: Number(chanceGanhador) || 0,
        created_at: ganhadorData.criado_em,
      },
      estatisticas: {
        total_participantes: totalParticipantes,
        total_tickets: totalTickets,
        timestamp_sorteio: timestampGanhador,
      },
      auditoria: {
        hash_auditoria: hashAuditoria,
        evento_inicio: eventoInicio?.criado_em || null,
        evento_fim: eventoFim?.criado_em || null,
      },
      top_10: top10,
    };

    const logsParaTela = top10.map((log) => ({
      ...log,
      mensagem: `${log.posicao}o colocado - ${log.nome_cliente || 'Sem nome'} (${log.tickets} tickets)`,
    }));

    const eventosParaTela = eventosData.map((evento) => ({
      tipo: evento.tipo,
      descricao: evento.descricao || '',
      detalhes: evento.detalhes,
      created_at: evento.criado_em,
    }));

    logInfo('/api/admin/sorteio/resumo', 'Resumo de sorteio retornado com sucesso', {
      sorteio_id: sorteioIdNum,
      total_participantes: totalParticipantes,
      total_tickets: totalTickets,
      requestId,
    });

    return successResponse({
      ...sorteioResumo,
      resumo: sorteioResumo,
      auditoria: sorteioResumo.auditoria,
      eventos: eventosParaTela,
      logs: logsParaTela,
      _links: {
        detalhes_completos: `/api/admin/sorteio/resumo/detalhes?sorteio_id=${sorteioIdNum}`,
      },
    });
  } catch (error) {
    logError(
      '/api/admin/sorteio/resumo',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/sorteio/resumo', requestId);
  }
}