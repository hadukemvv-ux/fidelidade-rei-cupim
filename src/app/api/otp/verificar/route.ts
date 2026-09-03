import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse, getRequestId, handleApiError, logError, successResponse } from '@/lib/api-utils';
import {
  attachOtpGrant,
  createOtpGrant,
  normalizeBrazilPhone,
  privateIdentifier,
  verifyWhatsAppOtp,
} from '@/lib/whatsappOtp';

const schema = z.object({
  telefone: z.string(),
  proposito: z.enum(['cadastro', 'redefinir_pin']),
  solicitacao_id: z.string().uuid(),
  codigo: z.string().regex(/^\d{4,10}$/),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Código ou solicitação inválidos.', 'validation_error', 400, requestId);

    const phone = normalizeBrazilPhone(parsed.data.telefone);
    const phoneHash = privateIdentifier(`phone:${phone.e164}`);
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
      .select('id')
      .maybeSingle();
    if (verifiedError) throw verifiedError;
    if (!verified) return errorResponse('Esta verificação não está mais disponível.', 'unauthorized', 409, requestId);

    return attachOtpGrant(successResponse({ verificado: true, expira_em_segundos: 600 }), grant);
  } catch (error) {
    logError('/api/otp/verificar', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/otp/verificar', requestId);
  }
}
