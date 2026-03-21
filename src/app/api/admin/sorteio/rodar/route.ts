import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import crypto from 'crypto';

function getRandomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

function calcularChancePercentual(tickets: number, totalTickets: number): number {
  if (totalTickets === 0) return 0;
  return (tickets / totalTickets) * 100;
}

function gerarHashAuditoria(sorteioId: number, ganhadorId: number, timestamp: string): string {
  const dados = `${sorteioId}-${ganhadorId}-${timestamp}`;
  return crypto.createHash('sha256').update(dados).digest('hex');
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  // ✅ Validar autenticação de admin
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/sorteio/rodar', 'Iniciando sorteio', { requestId });

    // ======================================================
    // 1. PEGAR SORTEIO ATIVO
    // ======================================================
    const { data: sorteio, error: sorteioErr } = await supabaseAdmin
      .from('sorteios')
      .select('*')
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();

    if (sorteioErr) {
      logError('/api/admin/sorteio/rodar', sorteioErr as Error, { requestId });
      return handleApiError(sorteioErr, '/api/admin/sorteio/rodar', requestId);
    }

    if (!sorteio) {
      return errorResponse('Nenhum sorteio ativo encontrado', 'not_found');
    }

    const sorteioLegacyId = Number(sorteio.id_new);
    if (!Number.isInteger(sorteioLegacyId) || sorteioLegacyId <= 0) {
      return errorResponse('Sorteio ativo sem id_new valido', 'server_error');
    }

    // ======================================================
    // 2. VALIDAR SE JÁ FOI CONCLUÍDO
    // ======================================================
    const { data: ganhadorExistente } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('*')
      .eq('sorteio_id', sorteioLegacyId)
      .limit(1);

    if (ganhadorExistente && ganhadorExistente.length > 0) {
      logInfo('/api/admin/sorteio/rodar', 'Tentativa de sorteio duplicado', {
        sorteio_id: sorteioLegacyId,
        requestId,
      });

      // Registrar tentativa
      await supabaseAdmin
        .from('sorteios_eventos')
        .insert({
          sorteio_id: sorteio.id,
          tipo: 'erro',
          descricao: 'Tentativa de sorteio duplicado bloqueada',
          detalhes: { timestamp: new Date().toISOString() },
        });

      return errorResponse('Este sorteio já foi concluído', 'validation_error');
    }

    // ======================================================
    // 3. REGISTRAR EVENTO: SORTEIO INICIADO
    // ======================================================
    await supabaseAdmin
      .from('sorteios_eventos')
      .insert({
        sorteio_id: sorteio.id,
        tipo: 'inicio',
        descricao: 'Sorteio iniciado',
        detalhes: { timestamp: new Date().toISOString(), requestId },
      });

    // ======================================================
    // 4. PEGAR CLIENTES ELEGÍVEIS
    // ======================================================
    const { data: clientes, error: cliErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, telefone, tickets')
      .gt('tickets', 0);

    if (cliErr) {
      logError('/api/admin/sorteio/rodar', cliErr as Error, { requestId });
      return handleApiError(cliErr, '/api/admin/sorteio/rodar', requestId);
    }

    if (!clientes || clientes.length === 0) {
      await supabaseAdmin
        .from('sorteios_eventos')
        .insert({
          sorteio_id: sorteio.id,
          tipo: 'erro',
          descricao: 'Nenhum cliente com tickets encontrado',
          detalhes: { timestamp: new Date().toISOString() },
        });

      return errorResponse('Nenhum cliente possui tickets', 'validation_error');
    }

    // ======================================================
    // 5. CALCULAR TOTAL E VALIDAR
    // ======================================================
    let totalTickets = 0;
    const clientesOrdenados = clientes
      .map((cli) => ({
        ...cli,
        tickets: Number(cli.tickets) || 0,
      }))
      .filter((cli) => cli.tickets > 0)
      .sort((a, b) => b.tickets - a.tickets);

    clientesOrdenados.forEach((cli) => {
      totalTickets += cli.tickets;
    });

    if (totalTickets === 0) {
      await supabaseAdmin
        .from('sorteios_eventos')
        .insert({
          sorteio_id: sorteio.id,
          tipo: 'erro',
          descricao: 'Total de tickets inválido',
          detalhes: { timestamp: new Date().toISOString() },
        });

      return errorResponse('Total de tickets inválido', 'validation_error');
    }

    // ======================================================
    // 6. REGISTRAR SNAPSHOT (AUDITORIA)
    // ======================================================
    const logsParaInserir = clientesOrdenados.map((cli) => ({
      sorteio_id: sorteio.id,
      cliente_id: cli.id,
      nome_cliente: cli.nome,
      telefone_cliente: cli.telefone,
      tickets: cli.tickets,
      chance_percentual: calcularChancePercentual(cli.tickets, totalTickets),
      total_tickets: totalTickets,
      total_participantes: clientesOrdenados.length,
    }));

    const { error: logsErr } = await supabaseAdmin
      .from('sorteios_logs')
      .insert(logsParaInserir);

    if (logsErr) {
      logError('/api/admin/sorteio/rodar', logsErr as Error, { requestId });
      return handleApiError(logsErr, '/api/admin/sorteio/rodar', requestId);
    }

    // ======================================================
    // 7. EXECUTAR SORTEIO
    // ======================================================
    const entradas: any[] = [];
    clientesOrdenados.forEach((cli) => {
      entradas.push(...Array(cli.tickets).fill(cli));
    });

    if (entradas.length === 0) {
      return errorResponse('Falha ao processar entradas do sorteio', 'server_error');
    }

    const indexSorteado = getRandomIndex(entradas.length);
    const ganhador = entradas[indexSorteado];
    const chanceGanhador = calcularChancePercentual(ganhador.tickets, totalTickets);

    // ======================================================
    // 8. SALVAR GANHADOR
    // ======================================================
    const timestampGanhador = new Date().toISOString();
    const hashAuditoria = gerarHashAuditoria(sorteioLegacyId, ganhador.id, timestampGanhador);

    const { error: ganhadorErr } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .insert({
        sorteio_id: sorteioLegacyId,
        cliente_id: null,
        nome_cliente: ganhador.nome,
        telefone_cliente: ganhador.telefone,
        tickets_no_sorteio: ganhador.tickets,
        criado_em: timestampGanhador,
      });

    if (ganhadorErr) {
      logError('/api/admin/sorteio/rodar', ganhadorErr as Error, { requestId });
      return handleApiError(ganhadorErr, '/api/admin/sorteio/rodar', requestId);
    }

    // ======================================================
    // 9. ATUALIZAR SORTEIO + ZERAR TICKETS
    // ======================================================
    const { error: updErr } = await supabaseAdmin
      .from('sorteios')
      .update({ status: 'concluido', atualizado_em: new Date().toISOString() })
      .eq('id', sorteio.id);

    if (updErr) {
      logError('/api/admin/sorteio/rodar', updErr as Error, { requestId });
      return handleApiError(updErr, '/api/admin/sorteio/rodar', requestId);
    }

    const { error: zerarErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ tickets: 0 })
      .neq('tickets', 0);

    if (zerarErr) {
      logError('/api/admin/sorteio/rodar', zerarErr as Error, { requestId });
      return handleApiError(zerarErr, '/api/admin/sorteio/rodar', requestId);
    }

    // ======================================================
    // 10. REGISTRAR EVENTOS FINAIS
    // ======================================================
    await supabaseAdmin
      .from('sorteios_eventos')
      .insert([
        {
          sorteio_id: sorteio.id,
          tipo: 'ganhador_definido',
          descricao: `Ganhador: ${ganhador.nome} (${ganhador.tickets} tickets)`,
          detalhes: {
            ganhador_id: ganhador.id,
            chance_percentual: chanceGanhador,
            hash_auditoria: hashAuditoria,
          },
        },
        {
          sorteio_id: sorteio.id,
          tipo: 'tickets_resetados',
          descricao: `Tickets resetados para ${clientesOrdenados.length} clientes`,
          detalhes: {
            clientes_afetados: clientesOrdenados.length,
            total_tickets_zerados: totalTickets,
          },
        },
        {
          sorteio_id: sorteio.id,
          tipo: 'fim',
          descricao: 'Sorteio concluído com sucesso',
          detalhes: {
            ganhador_id: ganhador.id,
            total_participantes: clientesOrdenados.length,
            timestamp: timestampGanhador,
          },
        },
      ]);

    logInfo('/api/admin/sorteio/rodar', 'Sorteio concluído com sucesso', {
      sorteio_id: sorteioLegacyId,
      ganhador_id: ganhador.id,
      participantes: clientesOrdenados.length,
      requestId,
    });

    return successResponse({
      sorteio_id: sorteioLegacyId,
      sorteio_uuid: sorteio.id,
      ganhador: {
        id: ganhador.id,
        nome: ganhador.nome,
        telefone: ganhador.telefone,
        tickets: ganhador.tickets,
        chance_percentual: chanceGanhador,
      },
      auditoria: {
        total_participantes: clientesOrdenados.length,
        total_tickets: totalTickets,
        hash_auditoria: hashAuditoria,
        timestamp: timestampGanhador,
      },
    });

  } catch (error) {
    logError('/api/admin/sorteio/rodar', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/sorteio/rodar', requestId);
  }
}