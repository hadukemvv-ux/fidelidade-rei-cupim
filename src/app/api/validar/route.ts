import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import { requireOperationalActor } from '@/lib/operationalAuth';

type LegacyRedeemResult = {
  ok?: boolean;
  motivo?: string;
  usado_em?: string;
  tipo?: string;
  premio_nome?: string;
  valor?: number;
};

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const actor = await requireOperationalActor(request, 'caixa', ['caixa', 'superadmin']);
  if (actor instanceof Response) return actor;

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
      .select('id, premio_nome, tipo, valor, codigo, criado_em, usado_em')
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
      const { data: resultadoRaw, error: updateError } = await supabaseAdmin.rpc('usar_resgate_legado', {
        p_codigo: codigo,
        p_actor_user_id: actor.userId,
        p_actor_email: actor.email,
        p_origem: 'caixa_legado',
      });
      if (updateError) return handleApiError(updateError, '/api/validar', requestId);

      const resultado = resultadoRaw as LegacyRedeemResult | null;
      if (!resultado?.ok) {
        return errorResponse(resultado?.motivo || 'Cupom já utilizado ou indisponível.', 'validation_error', 409);
      }

      logInfo('/api/validar', 'Cupom utilizado com sucesso', {
        codigo_inicio: codigo.substring(0, 3),
        actor_user_id: actor.userId,
        requestId,
      });

      return successResponse({
        utilizado: true,
        detalhes: { ...detalhes, usado_em: resultado.usado_em },
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
