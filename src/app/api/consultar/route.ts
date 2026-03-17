import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getNivelPorGasto, calcularProgressaoNivel } from '@/lib/fidelidade-rules';
import { validarDados, ConsultaSchema, type ConsultaValidation } from '@/lib/validations';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  handleApiError,
  logInfo,
  getRequestId 
} from '@/lib/api-utils';

// GET /api/consultar?telefone=...
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Validar entrada
    const validacao = validarDados<ConsultaValidation>(
      ConsultaSchema,
      { telefone: searchParams.get('telefone') }
    );

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { telefone } = validacao.data;

    // Log da consulta
    logInfo('/api/consultar', 'Buscando cliente', { telefone: `****${telefone.slice(-4)}`, requestId });

    // Buscar cliente na tabela principal (otimizado - select específico)
    const { data: cliente, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, email, data_nascimento, telefone, total_gasto, pontos, cashback, tickets')
      .eq('telefone', telefone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        logInfo('/api/consultar', 'Cliente não encontrado', { telefone, requestId });
        return errorResponse('Cliente não encontrado', 'not_found', 404, requestId);
      }
      throw error;
    }

    if (!cliente) {
      return errorResponse('Cliente não encontrado', 'not_found', 404, requestId);
    }

    // Usar a estrutura unificada para cálculos
    const progresso = calcularProgressaoNivel(cliente.total_gasto);
    const nivelAtual = getNivelPorGasto(cliente.total_gasto);

    logInfo('/api/consultar', 'Cliente encontrado e processado', {
      telefone: `****${telefone.slice(-4)}`,
      nivel: progresso.nivel,
      requestId
    });

    return successResponse({
      cliente: {
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || null,
        data_nascimento: cliente.data_nascimento || null,
      },
      pontos: Number(cliente.pontos || 0),
      cashback: Number(cliente.cashback || 0),
      tickets: Number(cliente.tickets || 0),
      nivel: {
        atual: progresso.nivel,
        proximo: progresso.proximoNivel,
        gastoAcumulado: progresso.gastoAcumulado,
        progresso: progresso.progresso,
        multiplicador: nivelAtual.beneficio.pontos,
      },
    });
  } catch (error: any) {
    return handleApiError(error, 'GET /api/consultar', requestId);
  }
}