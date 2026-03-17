import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const { cupom: codigoRaw, acao } = body;

    // ===== VALIDAR INPUT =====
    if (!codigoRaw || !acao) {
      return validationErrorResponse('Código e ação são obrigatórios');
    }

    const codigo = codigoRaw.toString().trim().toUpperCase();
    const acaoValida = ['consultar', 'baixar'].includes(acao);

    if (!acaoValida) {
      return errorResponse('Ação deve ser "consultar" ou "baixar"', 'validation_error');
    }

    logInfo('/api/validar', `Validando cupom - ação: ${acao}`, {
      codigo_inicio: codigo.substring(0, 3),
      requestId,
    });

    // ===== BUSCAR CUPOM =====
    const { data: cupom, error } = await supabaseAdmin
      .from('resgates')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) {
      logError('/api/validar', error as Error, { requestId });
      return handleApiError(error, '/api/validar', requestId);
    }

    if (!cupom) {
      logInfo('/api/validar', 'Cupom não encontrado', { codigo, requestId });
      return errorResponse('Código não encontrado', 'not_found');
    }

    // ===== VERIFICAR SE JÁ ESTÁ USADO =====
    if (cupom.usado_em) {
      logInfo('/api/validar', 'Tentativa de usar cupom já utilizado', {
        codigo,
        usado_em: cupom.usado_em,
        requestId,
      });
      return errorResponse(
        `Cupom já foi utilizado em ${new Date(cupom.usado_em).toLocaleString('pt-BR')}`,
        'validation_error'
      );
    }

    // ===== CONSTRUIR DETALHES =====
    const detalhes = {
      descricao: cupom.premio_nome || cupom.tipo || 'Desconto Especial',
      telefone: cupom.telefone ?? 'Não informado',
      criado_em: cupom.criado_em,
      valor: cupom.valor,
      tipo: cupom.tipo,
      codigo: cupom.codigo,
    };

    // ===== AÇÃO: CONSULTAR =====
    if (acao === 'consultar') {
      return successResponse({
        disponivel: true,
        detalhes,
      });
    }

    // ===== AÇÃO: BAIXAR (USAR CUPOM) =====
    if (acao === 'baixar') {
      const usadoEm = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('resgates')
        .update({ usado_em: usadoEm })
        .eq('id', cupom.id);

      if (updateError) {
        logError('/api/validar', updateError as Error, {
          acao: 'baixar',
          codigo,
          requestId,
        });
        return handleApiError(updateError, '/api/validar', requestId);
      }

      logInfo('/api/validar', 'Cupom utilizado com sucesso', {
        codigo,
        requestId,
      });

      return successResponse({
        utilizado: true,
        detalhes: { ...detalhes, usado_em: usadoEm },
      });
    }

    return errorResponse('Ação inválida', 'validation_error');

  } catch (error) {
    logError('/api/validar', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/validar', requestId);
  }
}