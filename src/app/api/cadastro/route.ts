import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados, ClienteSchema, type ClienteValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo } from '@/lib/api-utils';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { hashPin, verifyPin } from '@/lib/pin';
import { attachCustomerSession } from '@/lib/customerSession';
import { clearOtpGrant, getOtpGrantHashes, isOtpEnabled, isBetaPhoneAllowed } from '@/lib/whatsappOtp';
import { isPreCadastro } from '@/lib/customerRegistration';
import { BONUS_CADASTRO_PONTOS } from '@/lib/fidelidade-rules';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { signupResultResponse } from '@/lib/customerSignupResult';

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    const blocked = await bloquearSeContencaoAtiva();
    if (blocked) return blocked;
    const validacao = validarDados<ClienteValidation>(ClienteSchema, await req.json());
    if (!validacao.ok) return validationErrorResponse(validacao.error);
    const { telefone, nome, email, data_nascimento, aceita_whatsapp_aniversario, pin } = validacao.data;
    if (!pin || !/^\d{4}$/.test(pin)) return errorResponse('PIN deve ter exatamente 4 dígitos', 'validation_error');

    const { data: encontrados, error: searchError } = await supabaseAdmin
      .from('base_clientes_saipos').select('*').eq('telefone', telefone);
    if (searchError) throw searchError;
    if (encontrados && encontrados.length > 1) {
      const authError = await validateCustomerAuth(req, telefone);
      if (authError) return authError;
      return errorResponse('Encontramos mais de um cadastro para este telefone. Fale com a equipe para revisão segura.',
        'validation_error', 409, requestId);
    }

    const cliente = encontrados?.[0];
    if (!cliente || isPreCadastro(cliente)) {
      // A previously verified proof must not open signup after pilot disablement.
      // No sender calls or automatic retries happen on this route.
      if (!isOtpEnabled() || !isBetaPhoneAllowed(telefone)) {
        return errorResponse('Cadastro temporariamente indisponível para este telefone.', 'unauthorized', 403, requestId);
      }
      const hashes = getOtpGrantHashes(req, telefone);
      if (!hashes) return errorResponse('Confirme o código enviado ao seu WhatsApp antes de cadastrar.', 'unauthorized', 403, requestId);
      const { data, error } = await supabaseAdmin.rpc('concluir_cadastro_otp', {
        ...hashes,
        p_telefone: telefone, p_nome: nome, p_email: email || null,
        p_data_nascimento: data_nascimento || null,
        p_consentimento_aniversario: Boolean(data_nascimento && aceita_whatsapp_aniversario),
        p_pin_hash: await hashPin(pin), p_bonus_pontos: BONUS_CADASTRO_PONTOS,
      });
      if (error) throw error;
      const outcome = signupResultResponse(data);
      if (!outcome.ok) return errorResponse(outcome.message, outcome.code, outcome.status, requestId);
      logInfo('/api/cadastro', 'Cadastro e confirmação salvos na mesma transação', { requestId, criado: outcome.criado });
      return attachCustomerSession(clearOtpGrant(successResponse({
        ...(outcome.criado ? { criado: true } : { atualizado: true }),
        message: outcome.criado ? 'Cadastro realizado com sucesso!' : 'Cadastro completado com sucesso!',
        bonus: outcome.bonus,
      })), telefone);
    }

    // Complete accounts require their own session and PIN; signup cannot overwrite
    // their credentials or grant another bonus.
    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;
    if (cliente.nome !== nome) return errorResponse('Este número já tem cadastro. Nome não pode ser alterado.', 'validation_error');
    if (data_nascimento && cliente.data_nascimento && cliente.data_nascimento !== data_nascimento) {
      return errorResponse('Data de nascimento não pode ser alterada', 'validation_error');
    }
    if (email && cliente.email && cliente.email !== email) return errorResponse('Email não pode ser alterado após cadastro completo', 'validation_error');
    const verificacaoPin = await verifyPin(pin, cliente.pin_hash);
    if (!verificacaoPin.valid) return errorResponse('PIN incorreto', 'unauthorized');
    if (verificacaoPin.needsRehash) {
      const { error } = await supabaseAdmin.from('base_clientes_saipos')
        .update({ pin_hash: await hashPin(pin), atualizado_em: new Date().toISOString() }).eq('id', cliente.id);
      if (error) throw error;
    }
    return successResponse({ message: 'Cadastro já existe com estes dados. Você pode fazer login.' });
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse('Formato JSON inválido', 'validation_error', 400, requestId);
    // Postgres details can embed personal data. Never log/return raw database
    // errors, request bodies, PINs, hashes or grants from signup.
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unexpected';
    console.error('[CADASTRO_ERROR]', { requestId, code: /^[A-Z0-9_]{1,20}$/.test(code) ? code : 'unexpected' });
    return errorResponse('Não foi possível concluir o cadastro. Tente novamente; se persistir, fale com a equipe.',
      'server_error', 503, requestId);
  }
}
