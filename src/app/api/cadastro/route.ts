import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados, ClienteSchema, type ClienteValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { hashPin, isLegacyAutomaticPin, verifyPin } from '@/lib/pin';
import { attachCustomerSession } from '@/lib/customerSession';
import { clearOtpGrant, consumeOtpGrant } from '@/lib/whatsappOtp';
import { isPreCadastro } from '@/lib/customerRegistration';
import { BONUS_CADASTRO_PONTOS } from '@/lib/fidelidade-rules';

function iso() {
  return new Date().toISOString();
}

async function registrarExtrato(cliente_id: number, valor: number, descricao: string) {
  const { error } = await supabaseAdmin.from('extrato_pontos').insert({
    cliente_id,
    tipo: 'entrada',
    valor,
    origem: 'SISTEMA',
    descricao,
    criado_em: iso(),
    metodo: 'cadastro',
  });
  if (error) logError('/api/cadastro/extrato', error as Error, { cliente_id });
}

async function validarEmailDisponivel(email: string | null | undefined, telefone: string) {
  if (!email) return null;
  const { data, error } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('id, telefone')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data && data.telefone !== telefone ? data : null;
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body = await req.json();

    // ===== 1. VALIDAÇÃO COM ZOD =====
    const validacao = validarDados<ClienteValidation>(ClienteSchema, body);
    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { telefone, nome, email, data_nascimento, pin } = validacao.data;

    logInfo('/api/cadastro', 'Iniciando cadastro', {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    // ===== 2. VALIDAR PIN (4 dígitos) =====
    if (!pin || !/^\d{4}$/.test(pin)) {
      return errorResponse('PIN deve ter exatamente 4 dígitos', 'validation_error');
    }

    // ===== 3. BUSCAR CLIENTE PELO TELEFONE =====
    const { data: encontrados, error: searchError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone);

    if (searchError) {
      logError('/api/cadastro', searchError as Error, {
        requestId,
      });
      return handleApiError(searchError, '/api/cadastro', requestId);
    }

    // ===== CASO 1: NOVO CLIENTE =====
    if (!encontrados || encontrados.length === 0) {
      if (await validarEmailDisponivel(email, telefone)) {
        return errorResponse('Este email já está cadastrado em outra conta', 'validation_error');
      }

      const pin_hash = await hashPin(pin);
      if (!(await consumeOtpGrant(req, telefone, 'cadastro'))) {
        return errorResponse('Confirme o código enviado ao seu WhatsApp antes de cadastrar.', 'unauthorized', 403, requestId);
      }

      const bonus = BONUS_CADASTRO_PONTOS;
      const { data: novo, error: insertError } = await supabaseAdmin
        .from('base_clientes_saipos')
        .insert({
          nome,
          email: email || null,
          telefone,
          pin_hash,
          data_nascimento: data_nascimento || null,
          telefone_verificado_em: iso(),
          pontos: bonus,
          cashback: 0,
          tickets: 0,
          nivel: 'BRONZE',
          total_gasto: 0,
          qtd_pedidos: 0,
          primeira_compra: null,
          ultima_compra: null,
          atualizado_em: iso(),
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      if (bonus > 0) await registrarExtrato(novo.id, bonus, 'Bônus de Cadastro');

      logInfo('/api/cadastro', 'Novo cliente verificado criado', {
        telefone: `****${telefone.slice(-4)}`,
        bonus,
        requestId,
      });

      return attachCustomerSession(clearOtpGrant(successResponse({
        criado: true,
        message: 'Cadastro realizado com sucesso!',
        bonus,
      })), telefone);
    }

    // ===== CASO 2: CLIENTE EXISTENTE =====
    if (encontrados.length === 1) {
      const cliente = encontrados[0];
      const preCadastro = isPreCadastro(cliente);

      // Pré-cadastro só pode ser assumido após comprovar o WhatsApp.
      if (preCadastro) {
        if (await validarEmailDisponivel(email, telefone)) {
          return errorResponse('Este email já está cadastrado em outra conta', 'validation_error');
        }

        const novoPinHash = await hashPin(pin);
        if (!(await consumeOtpGrant(req, telefone, 'cadastro'))) {
          return errorResponse('Confirme o código enviado ao seu WhatsApp antes de concluir.', 'unauthorized', 403, requestId);
        }

        const updateData: Record<string, unknown> = {
          atualizado_em: iso(),
          telefone_verificado_em: iso(),
          pontos: Number(cliente.pontos || 0) + BONUS_CADASTRO_PONTOS,
        };

        if (!cliente.nome || cliente.nome === 'Cliente Novo (Roleta)') {
          updateData.nome = nome;
        }
        if (!cliente.email && email) {
          updateData.email = email;
        }
        if (!cliente.data_nascimento) {
          updateData.data_nascimento = data_nascimento || null;
        }
        if (!cliente.pin_hash || isLegacyAutomaticPin(telefone, cliente.pin_hash)) {
          updateData.pin_hash = novoPinHash;
        }

        const { error: updateError } = await supabaseAdmin
          .from('base_clientes_saipos')
          .update(updateData)
          .eq('id', cliente.id);

        if (updateError) {
          logError('/api/cadastro', updateError as Error, {
            requestId,
          });
          return handleApiError(updateError, '/api/cadastro', requestId);
        }

        await registrarExtrato(cliente.id, BONUS_CADASTRO_PONTOS, 'Bônus de Cadastro');

        logInfo('/api/cadastro', 'Pré-cadastro completado', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });

        return attachCustomerSession(clearOtpGrant(successResponse({
          atualizado: true,
          message: 'Cadastro completado com sucesso!',
          bonus: BONUS_CADASTRO_PONTOS,
        })), telefone);
      }

      // Conta completa só pode ser consultada/alterada pela própria sessão.
      const authError = await validateCustomerAuth(req, telefone);
      if (authError) return authError;

      if (await validarEmailDisponivel(email, telefone)) {
        return errorResponse('Este email já está cadastrado em outra conta', 'validation_error');
      }

      // Se já é cliente completo, validar dados
      if (cliente.nome !== nome) {
        return errorResponse('Este número já tem cadastro. Nome não pode ser alterado.', 'validation_error');
      }

      if (cliente.data_nascimento && cliente.data_nascimento !== data_nascimento) {
        return errorResponse('Data de nascimento não pode ser alterada', 'validation_error');
      }

      if (email && cliente.email && cliente.email !== email) {
        return errorResponse('Email não pode ser alterado após cadastro completo', 'validation_error');
      }

      const verificacaoPin = await verifyPin(pin, cliente.pin_hash);
      if (!verificacaoPin.valid) {
        logInfo('/api/cadastro', 'PIN incorreto para cliente existente', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });
        return errorResponse('PIN incorreto', 'unauthorized');
      }

      if (verificacaoPin.needsRehash) {
        await supabaseAdmin
          .from('base_clientes_saipos')
          .update({ pin_hash: await hashPin(pin), atualizado_em: iso() })
          .eq('id', cliente.id);
      }

      return successResponse({
        message: 'Cadastro já existe com estes dados. Você pode fazer login.',
      });
    }

    // ===== CASO 3: DUPLICADOS =====
    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;
    // Se houver múltiplos clientes, unificar (manter o primeiro)
    const ids = encontrados.map((c) => c.id);
    const paraExcluir = ids.slice(1);

    const { error: deleteError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .delete()
      .in('id', paraExcluir);

    if (deleteError) {
      logError('/api/cadastro', deleteError as Error, {
        requestId,
      });
      return handleApiError(deleteError, '/api/cadastro', requestId);
    }

    logInfo('/api/cadastro', `Unificados ${paraExcluir.length} clientes duplicados`, {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    return successResponse({
      unificado: true,
      message: 'Cadastros unificados. Faça login novamente.',
    });

  } catch (error) {
    logError('/api/cadastro', error instanceof Error ? error : new Error(String(error)), {
      requestId: getRequestId(req),
    });
    return handleApiError(error, '/api/cadastro', requestId);
  }
}
