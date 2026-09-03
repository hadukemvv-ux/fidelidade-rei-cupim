import { randomBytes } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isPhoneInBetaList, normalizeBrazilPhone, privateIdentifier as hashIdentifier } from '@/lib/otpCore';

export { normalizeBrazilPhone } from '@/lib/otpCore';

export type OtpPurpose = 'cadastro' | 'redefinir_pin';

export const OTP_GRANT_COOKIE = 'fidelidade_otp_grant';
const OTP_GRANT_SECONDS = 10 * 60;

function requiredSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Segredo do servidor não configurado.');
  return secret;
}

export function privateIdentifier(value: string) {
  return hashIdentifier(value, requiredSecret());
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function isOtpEnabled() {
  return process.env.WHATSAPP_OTP_ENABLED === 'true';
}

export function isBetaPhoneAllowed(phone: string) {
  return isPhoneInBetaList(
    phone,
    process.env.WHATSAPP_OTP_BETA_PHONES || '',
    process.env.WHATSAPP_OTP_BETA_ONLY !== 'false'
  );
}

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    throw new Error('WhatsApp OTP ainda não foi configurado.');
  }
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || !/^VA[a-f0-9]{32}$/i.test(serviceSid)) {
    throw new Error('Configuração do WhatsApp OTP inválida.');
  }
  return { accountSid, authToken, serviceSid };
}

async function twilioPost(path: string, params: URLSearchParams) {
  const { accountSid, authToken, serviceSid } = twilioConfig();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });

  const data = (await response.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string };
  if (!response.ok) throw new Error(data.message || 'O provedor não conseguiu processar o código.');
  return data;
}

export async function sendWhatsAppOtp(e164Phone: string) {
  return twilioPost('Verifications', new URLSearchParams({ To: e164Phone, Channel: 'whatsapp', Locale: 'pt-BR' }));
}

export async function verifyWhatsAppOtp(e164Phone: string, code: string) {
  return twilioPost('VerificationCheck', new URLSearchParams({ To: e164Phone, Code: code }));
}

export function createOtpGrant() {
  return randomBytes(32).toString('base64url');
}

export function attachOtpGrant(response: NextResponse, grant: string) {
  response.cookies.set(OTP_GRANT_COOKIE, grant, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: OTP_GRANT_SECONDS,
    path: '/',
  });
  return response;
}

function getCookie(request: Request, name: string) {
  const value = (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  try {
    return value ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
}

export async function consumeOtpGrant(request: Request, phone: string, purpose: OtpPurpose) {
  const grant = getCookie(request, OTP_GRANT_COOKIE);
  if (!grant) return false;
  const normalized = normalizeBrazilPhone(phone);
  const { data, error } = await supabaseAdmin.rpc('consumir_grant_otp', {
    p_grant_hash: privateIdentifier(`grant:${grant}`),
    p_telefone_hash: privateIdentifier(`phone:${normalized.e164}`),
    p_proposito: purpose,
  });
  if (error) throw error;
  return data === true;
}

export function clearOtpGrant(response: NextResponse) {
  response.cookies.set(OTP_GRANT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
