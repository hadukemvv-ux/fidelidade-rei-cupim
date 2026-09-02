import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import crypto from 'crypto';
import { z } from 'zod';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';

// Schema para redefinição de PIN
const RedefinirPinSchema = z.object({
  telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato YYYY-MM-DD'),
  novo_pin: z.string().regex(/^\d{4}$/, 'PIN deve ter 4 dígitos'),
});

type RedefinirPinInput = z.infer<typeof RedefinirPinSchema>;

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body = await req.json();

    // ===== VALIDAR INPUT COM ZOD =====
    const validacao = validarDados<RedefinirPinInput>(RedefinirPinSchema, body);
    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { telefone, data_nascimento, novo_pin } = validacao.data;

    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;

    logInfo('/api/redefinir-pin', 'Iniciando redefinição de PIN', {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    const novoPinHash = crypto.createHash('sha256').update(novo_pin).digest('hex');

    // ===== BUSCAR CLIENTE =====
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, nome, telefone, pin_hash, data_nascimento')
      .eq('telefone', telefone)
      .maybeSingle();

    if (clienteError) {
      logError('/api/redefinir-pin', clienteError as Error, { requestId });
      return handleApiError(clienteError, '/api/redefinir-pin', requestId);
    }

    if (!cliente) {
      logInfo('/api/redefinir-pin', 'Cliente não encontrado', {
        telefone: `****${telefone.slice(-4)}`,
        requestId,
      });
      return errorResponse('Cliente não encontrado', 'not_found');
    }

    // ===== VALIDAR DATA DE NASCIMENTO =====
    if (!cliente.data_nascimento) {
      return errorResponse(
        'Data de nascimento não cadastrada. Entre em contato com o suporte',
        'validation_error'
      );
    }

    if (cliente.data_nascimento !== data_nascimento) {
      logInfo('/api/redefinir-pin', 'Data de nascimento não confere', {
        telefone: `****${telefone.slice(-4)}`,
        requestId,
      });
      return errorResponse('Data de nascimento não confere', 'validation_error');
    }

    // ===== VALIDAR PIN NOVO =====
    if (cliente.pin_hash === novoPinHash) {
      return errorResponse('Este já é o seu PIN atual', 'validation_error');
    }

    // ===== ATUALIZAR PIN =====
    const { error: updateError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update({ pin_hash: novoPinHash, atualizado_em: new Date().toISOString() })
      .eq('id', cliente.id);

    if (updateError) {
      logError('/api/redefinir-pin', updateError as Error, { requestId });
      return handleApiError(updateError, '/api/redefinir-pin', requestId);
    }

    // ===== REGISTRAR LOG DE SEGURANÇA =====
    try {
      await supabaseAdmin.from('saipos_cron_logs').insert({
        tipo: 'PIN_REDEFINIDO',
        mensagem: `PIN redefinido para cliente ${cliente.telefone}`,
        id_cliente: cliente.id,
        criado_em: new Date().toISOString(),
      });
    } catch (logError) {
      // Silencioso - não impede o fluxo
      console.warn('Falha ao registrar log de segurança:', logError);
    }

    logInfo('/api/redefinir-pin', 'PIN redefinido com sucesso', {
      telefone: `****${telefone.slice(-4)}`,
      cliente_id: cliente.id,
      requestId,
    });

    return successResponse({
      message: 'PIN redefinido com sucesso!',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError('/api/redefinir-pin', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/redefinir-pin', requestId);
  }
}
