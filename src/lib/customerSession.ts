import crypto from 'crypto';
import type { NextResponse } from 'next/server';

export const CUSTOMER_SESSION_COOKIE = 'fidelidade_customer_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

type CustomerSessionPayload = {
  version: 1;
  phone: string;
  expiresAt: number;
};

function onlyDigits(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

function getSigningKey() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('CUSTOMER_SESSION_SECRET não configurado.');
  return crypto.createHash('sha256').update(`fidelidade-customer-session:${secret}`).digest();
}

function sign(encodedPayload: string) {
  return crypto.createHmac('sha256', getSigningKey()).update(encodedPayload).digest('base64url');
}

export function createCustomerSessionToken(phone: string, expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000) {
  const normalizedPhone = onlyDigits(phone);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
    throw new Error('Telefone inválido para sessão.');
  }

  const payload: CustomerSessionPayload = { version: 1, phone: normalizedPhone, expiresAt };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readCustomerSessionToken(token: string | null | undefined): CustomerSessionPayload | null {
  if (!token) return null;
  const [encodedPayload, providedSignature, extra] = token.split('.');
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as CustomerSessionPayload;
    const phone = onlyDigits(payload.phone);
    if (payload.version !== 1 || phone.length < 10 || phone.length > 11) return null;
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return { ...payload, phone };
  } catch {
    return null;
  }
}

export function getCustomerSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CUSTOMER_SESSION_COOKIE}=`))
    ?.slice(CUSTOMER_SESSION_COOKIE.length + 1);

  try {
    return readCustomerSessionToken(token ? decodeURIComponent(token) : null);
  } catch {
    return null;
  }
}

export function attachCustomerSession(response: NextResponse, phone: string) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionToken(phone), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
  return response;
}
