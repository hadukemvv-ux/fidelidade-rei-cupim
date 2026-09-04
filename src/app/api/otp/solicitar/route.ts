import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse, getRequestId, handleApiError, logError, successResponse } from '@/lib/api-utils';
import {
  getRequestIp,
  isBetaPhoneAllowed,
  isOtpEnabled,
  normalizeBrazilPhone,
  privateIdentifier,
  sendWhatsAppOtp,
} from '@/lib/whatsappOtp';
import { isPreCadastro } from '@/lib/customerRegistration';

const schema = z.object({
  telefone: z.string(),
  proposito: z.enum(['cadastro', 'redefinir_pin']),
});

function positiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  let reservationId: string | null = null;

  try {
    if (!isOtpEnabled()) {
      return errorResponse('A verificação por WhatsApp ainda não está liberada.', 'error', 503, requestId);
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Dados de verificação inválidos.', 'validation_error', 400, requestId);

    const phone = normalizeBrazilPhone(parsed.data.telefone);
    if (!isBetaPhoneAllowed(phone.local)) {
      return errorResponse('Este teste ainda está disponível somente para convidados.', 'unauthorized', 403, requestId);
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('nome, pin_hash, telefone')
      .eq('telefone', phone.local)
      .maybeSingle();
    if (customerError) throw customerError;

    const isPreRegistration = isPreCadastro(customer);
    if (parsed.data.proposito === 'cadastro' && customer && !isPreRegistration) {
      return errorResponse('Este WhatsApp já possui conta. Entre normalmente com seu PIN.', 'validation_error', 409, requestId);
    }
    if (parsed.data.proposito === 'redefinir_pin' && (!customer || isPreRegistration)) {
      return errorResponse('Conta completa não encontrada para este WhatsApp.', 'not_found', 404, requestId);
    }

    const phoneHash = privateIdentifier(`phone:${phone.e164}`);
    const ipHash = privateIdentifier(`ip:${getRequestIp(request)}`);
    const { data: reservation, error: reservationError } = await supabaseAdmin.rpc('reservar_envio_otp', {
      p_telefone_hash: phoneHash,
      p_ip_hash: ipHash,
      p_proposito: parsed.data.proposito,
      p_max_telefone_hora: positiveInt(process.env.OTP_MAX_PER_PHONE_HOUR, 3, 10),
      p_max_ip_hora: positiveInt(process.env.OTP_MAX_PER_IP_HOUR, 10, 50),
      p_max_global_dia: positiveInt(process.env.OTP_MAX_GLOBAL_DAY, 30, 1000),
      p_intervalo_segundos: positiveInt(process.env.OTP_RESEND_SECONDS, 60, 600),
    });

    if (reservationError) throw reservationError;
    const result = reservation as { autorizado?: boolean; solicitacao_id?: string; tentar_em_segundos?: number } | null;
    if (!result?.autorizado || !result.solicitacao_id) {
      return errorResponse(
        `Limite de segurança atingido. Tente novamente em ${result?.tentar_em_segundos || 60} segundos.`,
        'unauthorized',
        429,
        requestId
      );
    }
    reservationId = result.solicitacao_id;

    const provider = await sendWhatsAppOtp(phone.e164);
    await supabaseAdmin
      .from('otp_verificacoes')
      .update({ status: 'enviado', provedor_sid: provider.sid || null })
      .eq('id', reservationId);

    return successResponse({
      solicitacao_id: reservationId,
      expira_em_segundos: 600,
      reenviar_em_segundos: positiveInt(process.env.OTP_RESEND_SECONDS, 60, 600),
      destino: `WhatsApp terminado em ${phone.local.slice(-4)}`,
    });
  } catch (error) {
    if (reservationId) {
      await supabaseAdmin.from('otp_verificacoes').update({ status: 'falhou' }).eq('id', reservationId);
    }
    logError('/api/otp/solicitar', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/otp/solicitar', requestId);
  }
}
