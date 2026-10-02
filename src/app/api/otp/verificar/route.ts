import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse, logError, successResponse } from '@/lib/api-utils';
import { OtpRequestError, readOtpJson, otpNoStore } from '@/lib/otpRequest';
import { confirmQrOtp } from '@/lib/qrOtpFlow';
import {
  attachOtpGrant,
  createOtpGrant,
  isOtpEnabled,
  isBetaPhoneAllowed,
  normalizeBrazilPhone,
  privateIdentifier,
  verifyWhatsAppOtp,
} from '@/lib/whatsappOtp';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';

const schema = z.object({
  telefone: z.string().max(32),
  proposito: z.enum(['cadastro', 'redefinir_pin']),
  solicitacao_id: z.string().uuid(),
  codigo: z.string().regex(/^\d{4,10}$/),
});

export async function POST(request: Request) {
  return otpNoStore(await handlePost(request));
}

async function handlePost(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const blocked = await bloquearSeContencaoAtiva();
    if (blocked) return blocked;
    if (!isOtpEnabled()) return errorResponse('A verificação por WhatsApp ainda não está liberada.', 'error', 503, requestId);
    const parsed = schema.safeParse(await readOtpJson(request));
    if (!parsed.success) return errorResponse('Código ou solicitação inválidos.', 'validation_error', 400, requestId);

    let phone;
    try { phone = normalizeBrazilPhone(parsed.data.telefone); }
    catch { return errorResponse('Informe seu telefone com DDD.', 'validation_error', 400, requestId); }
    if (!isBetaPhoneAllowed(phone.local)) return errorResponse('Teste disponível somente para convidados.', 'unauthorized', 403, requestId);
    const phoneHash = privateIdentifier(`phone:${phone.e164}`);
    if (process.env.WHATSAPP_OTP_PROVIDER === 'qr') {
      const grant = createOtpGrant();
      const status = await confirmQrOtp({ env: process.env, rpc: async (name, args) => await supabaseAdmin.rpc(name, args) }, {
        id: parsed.data.solicitacao_id, phoneHash, purpose: parsed.data.proposito,
        code: parsed.data.codigo, grantHash: privateIdentifier(`grant:${grant}`),
      });
      if (status !== 'verificado') return errorResponse('Código incorreto, expirado ou já utilizado.', 'unauthorized', status === 'invalido' ? 401 : 429, requestId);
      return attachOtpGrant(successResponse({ verificado: true, expira_em_segundos: 600 }), grant);
    }
    const { data: attemptAllowed, error: attemptError } = await supabaseAdmin.rpc('registrar_tentativa_otp', {
      p_solicitacao_id: parsed.data.solicitacao_id,
      p_telefone_hash: phoneHash,
      p_proposito: parsed.data.proposito,
      p_max_tentativas: 5,
    });
    if (attemptError) throw attemptError;
    if (attemptAllowed !== true) {
      return errorResponse('Código expirado ou limite de tentativas atingido.', 'unauthorized', 429, requestId);
    }

    const provider = await verifyWhatsAppOtp(phone.e164, parsed.data.codigo);
    if (provider.status !== 'approved') {
      return errorResponse('Código incorreto ou expirado.', 'unauthorized', 401, requestId);
    }

    const grant = createOtpGrant();
    const { data: verified, error: verifiedError } = await supabaseAdmin
      .from('otp_verificacoes')
      .update({
        status: 'verificado',
        grant_hash: privateIdentifier(`grant:${grant}`),
        verificado_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .eq('id', parsed.data.solicitacao_id)
      .eq('telefone_hash', phoneHash)
      .eq('proposito', parsed.data.proposito)
      .eq('status', 'enviado')
      .gt('expira_em', new Date().toISOString())
      .select('id')
      .maybeSingle();
    if (verifiedError) throw verifiedError;
    if (!verified) return errorResponse('Esta verificação não está mais disponível.', 'unauthorized', 409, requestId);

    return attachOtpGrant(successResponse({ verificado: true, expira_em_segundos: 600 }), grant);
  } catch (error) {
    const invalid = error instanceof OtpRequestError;
    logError('/api/otp/verificar', new Error(invalid ? 'Requisição inválida' : 'Falha na verificação OTP'), { requestId });
    return errorResponse(invalid ? 'Requisição de verificação inválida.' : 'Não foi possível conferir o código.',
      invalid ? 'validation_error' : 'server_error', invalid ? error.status : 503, requestId);
  }
}
