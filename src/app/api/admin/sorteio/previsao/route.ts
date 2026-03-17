import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

type SorteioAtivo = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  data_sorteio: string | null;
  modo: string | null;
  status: string | null;
  criado_em: string;
};

type ClienteTicketRow = {
  id: number;
  nome: string | null;
  telefone: string | null;
  tickets: number | null;
};

type Participante = {
  id: number;
  nome: string;
  telefone: string;
  tickets: number;
  chance_percentual: number;
};

function calcularChancePercentual(tickets: number, totalTickets: number): number {
  if (totalTickets === 0) return 0;
  return (tickets / totalTickets) * 100;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/sorteio/previsao', 'Gerando previsao de sorteio', { requestId });

    // 1) Obter sorteio ativo
    const { data: sorteio, error: sorteioErr } = await supabaseAdmin
      .from('sorteios')
      .select('id, titulo, descricao, data_sorteio, modo, status, criado_em')
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sorteioErr) {
      logError('/api/admin/sorteio/previsao', sorteioErr as Error, { requestId });
      return handleApiError(sorteioErr, '/api/admin/sorteio/previsao', requestId);
    }

    if (!sorteio) {
      return successResponse({
        sorteio: null,
        participantes: [],
        total_participantes: 0,
        total_tickets: 0,
        top10: [],
      });
    }

    // 2) Buscar participantes
    const { data: clientes, error: cliErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, telefone, tickets')
      .gt('tickets', 0);

    if (cliErr) {
      logError('/api/admin/sorteio/previsao', cliErr as Error, { requestId });
      return handleApiError(cliErr, '/api/admin/sorteio/previsao', requestId);
    }

    if (!clientes || clientes.length === 0) {
      return successResponse({
        sorteio: sorteio as SorteioAtivo,
        participantes: [],
        total_participantes: 0,
        total_tickets: 0,
        top10: [],
      });
    }

    // 3) Ordenar por tickets
    const clientesTipados = clientes as unknown as ClienteTicketRow[];
    const ordenados = clientesTipados
      .map((c) => ({
        id: c.id,
        nome: c.nome || 'Sem nome',
        telefone: c.telefone || '-',
        tickets: Number(c.tickets) || 0,
      }))
      .sort((a, b) => b.tickets - a.tickets);

    const totalTickets = ordenados.reduce((sum, c) => sum + c.tickets, 0);
    const totalParticipantes = ordenados.length;

    // 4) Calcular chances
    const participantes: Participante[] = ordenados.map((c) => ({
      ...c,
      chance_percentual: Number(calcularChancePercentual(c.tickets, totalTickets).toFixed(4)),
    }));

    // 5) Top 10
    const top10 = participantes.slice(0, 10);

    logInfo('/api/admin/sorteio/previsao', 'Previsao gerada com sucesso', {
      sorteio_id: (sorteio as SorteioAtivo).id,
      total_participantes: totalParticipantes,
      total_tickets: totalTickets,
      requestId,
    });

    return successResponse({
      sorteio: sorteio as SorteioAtivo,
      participantes,
      total_participantes: totalParticipantes,
      total_tickets: totalTickets,
      top10,
    });

  } catch (error) {
    logError(
      '/api/admin/sorteio/previsao',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/sorteio/previsao', requestId);
  }
}