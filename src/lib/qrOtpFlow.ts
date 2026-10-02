import { qrOtpCodeKey, qrOtpEnabled, newQrOtpCode, hashQrOtpCode } from './qrOtpCore.ts';
import { normalizeBrazilPhone } from './otpCore.ts';

type Environment = Record<string, string | undefined>;
type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export type QrOtpPayload = { request_id: string; recipient: string; code: string; expires_at: string };

export function qrOtpTransportConfig(env: Environment) {
  if (!qrOtpEnabled(env) || env.WHATSAPP_OTP_BETA_ONLY !== 'true') throw new Error('OTP QR não configurado.');
  const phones = (env.WHATSAPP_OTP_BETA_PHONES || '').split(',').map(value => value.trim()).filter(Boolean);
  if (phones.length < 1 || phones.length > 3) throw new Error('OTP QR exige lista fechada de teste.');
  const recipients = phones.map(value => normalizeBrazilPhone(value).e164);
  const token = env.WHATSAPP_QR_OTP_TOKEN || '';
  if (!/^[a-f0-9]{64}$/i.test(token) || token.toLowerCase() === (env.WHATSAPP_QR_CONTROL_TOKEN || '').toLowerCase() ||
    token === env.CUSTOMER_SESSION_SECRET) throw new Error('Chave de transporte OTP inválida.');
  const codeKey = qrOtpCodeKey(env);
  if (codeKey.equals(Buffer.from(token, 'hex')) || codeKey.toString('base64url') === env.CUSTOMER_SESSION_SECRET ||
    codeKey.toString('hex') === env.CUSTOMER_SESSION_SECRET ||
    codeKey.toString('hex') === (env.WHATSAPP_QR_CONTROL_TOKEN || '').toLowerCase()) throw new Error('Chaves OTP devem ser distintas.');
  const url = new URL(env.WHATSAPP_QR_OTP_URL || '');
  const local = env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Endereço OTP inválido.');
  }
  return { origin: url.origin, token, codeKey, recipients };
}

// No retries. A lost/malformed response may hide an accepted send.
export async function dispatchQrOtp(env: Environment, payload: QrOtpPayload, transport: typeof fetch = fetch) {
  const config = qrOtpTransportConfig(env);
  if (!config.recipients.includes(payload.recipient)) throw new Error('Destino fora do piloto OTP.');
  try {
    const response = await transport(`${config.origin}/messages/otp`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok || !response.body) return 'unknown' as const;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256) { await reader.cancel(); return 'unknown' as const; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const result = JSON.parse(Buffer.concat(chunks).toString()) as { status?: unknown; duplicate?: unknown };
    return result.status === 'accepted' && typeof result.duplicate === 'boolean' ? 'accepted' as const : 'unknown' as const;
  } catch { return 'unknown' as const; }
}

export async function requestQrOtp(
  deps: { env: Environment; rpc: Rpc; transport?: typeof fetch },
  input: { id: string; e164: string; phoneHash: string; purpose: 'cadastro' | 'redefinir_pin' },
) {
  const config = qrOtpTransportConfig(deps.env);
  if (!config.recipients.includes(input.e164)) throw new Error('Destino fora do piloto OTP.');
  const code = newQrOtpCode();
  const prepared = await deps.rpc('preparar_otp_qr', {
    p_id: input.id, p_telefone_hash: input.phoneHash, p_proposito: input.purpose,
    p_codigo_hash: hashQrOtpCode(code, input.id, config.codeKey),
  });
  const record = prepared.data as { expira_em?: string } | null;
  if (prepared.error || !record?.expira_em) throw new Error('Não foi possível preparar a verificação.');
  const status = await dispatchQrOtp(deps.env, {
    request_id: input.id, recipient: input.e164, code, expires_at: new Date(record.expira_em).toISOString(),
  }, deps.transport);
  const finished = await deps.rpc('finalizar_envio_otp_qr', { p_id: input.id, p_aceito: status === 'accepted' });
  if (finished.error || finished.data !== true) throw new Error('Não foi possível concluir a solicitação. Não repita o envio agora.');
  return status;
}

export async function confirmQrOtp(
  deps: { env: Environment; rpc: Rpc },
  input: { id: string; phoneHash: string; purpose: 'cadastro' | 'redefinir_pin'; code: string; grantHash: string },
) {
  // Validate the same gates/configuration; disabled mode must not confirm an old code.
  const config = qrOtpTransportConfig(deps.env);
  if (!/^\d{6}$/.test(input.code)) return 'invalido';
  const result = await deps.rpc('verificar_otp_qr', {
    p_id: input.id, p_telefone_hash: input.phoneHash, p_proposito: input.purpose,
    p_codigo_hash: hashQrOtpCode(input.code, input.id, config.codeKey), p_grant_hash: input.grantHash,
  });
  if (result.error) throw new Error('Não foi possível conferir a verificação.');
  const record = result.data as { status?: string } | null;
  if (!record || !['verificado', 'invalido', 'indisponivel'].includes(record.status || '')) throw new Error('Resposta de verificação inválida.');
  return record.status;
}
