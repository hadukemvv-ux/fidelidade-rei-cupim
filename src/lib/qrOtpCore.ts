import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const SEALED_VERSION = 'v1';

export type QrOtpSecrets = { encryptionKey: Buffer; codeKey: Buffer };

function decodeKey(value: string | undefined, label: string): Buffer {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error(`${label} não configurada.`);
  const key = Buffer.from(value, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== value) throw new Error(`${label} inválida.`);
  return key;
}

export function qrOtpSecrets(env: Record<string, string | undefined>): QrOtpSecrets {
  const encryptionKey = decodeKey(env.WHATSAPP_QR_OTP_ENCRYPTION_KEY, 'Chave de criptografia OTP');
  const codeKey = decodeKey(env.WHATSAPP_QR_OTP_CODE_KEY, 'Chave de código OTP');
  if (timingSafeEqual(encryptionKey, codeKey)) throw new Error('Chaves OTP devem ser distintas.');
  return { encryptionKey, codeKey };
}

export function qrOtpEnabled(env: Record<string, string | undefined>) {
  return env.WHATSAPP_OTP_ENABLED === 'true' && env.WHATSAPP_OTP_PROVIDER === 'qr' &&
    env.WHATSAPP_QR_OTP_ENABLED === 'true';
}

function assertReservationId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Reserva OTP inválida.');
  }
}

function assertPhone(value: string) {
  if (!/^\+55\d{10,11}$/.test(value)) throw new Error('Destino OTP inválido.');
}

export function sealQrOtpPhone(phone: string, reservationId: string, key: Buffer) {
  assertPhone(phone);
  assertReservationId(reservationId);
  if (key.length !== 32) throw new Error('Chave OTP inválida.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`clube-cupim/qr-otp/${reservationId}`));
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  return `${SEALED_VERSION}.${iv.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}

export function openQrOtpPhone(sealed: string, reservationId: string, key: Buffer) {
  assertReservationId(reservationId);
  if (key.length !== 32) throw new Error('Chave OTP inválida.');
  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== SEALED_VERSION || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new Error('Destino OTP inválido.');
  }
  const [, ivText, dataText, tagText] = parts;
  const iv = Buffer.from(ivText, 'base64url');
  const tag = Buffer.from(tagText, 'base64url');
  const encrypted = Buffer.from(dataText, 'base64url');
  if (iv.length !== 12 || tag.length !== 16 || encrypted.length > 32) throw new Error('Destino OTP inválido.');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`clube-cupim/qr-otp/${reservationId}`));
    decipher.setAuthTag(tag);
    const phone = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    assertPhone(phone);
    return phone;
  } catch {
    throw new Error('Destino OTP inválido.');
  }
}

export function newQrOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashQrOtpCode(code: string, reservationId: string, key: Buffer) {
  assertReservationId(reservationId);
  if (key.length !== 32 || !/^\d{6}$/.test(code)) throw new Error('Código OTP inválido.');
  return createHmac('sha256', key).update(`clube-cupim/qr-otp/${reservationId}/${code}`).digest('hex');
}

export function matchesQrOtpCode(code: string, reservationId: string, key: Buffer, expectedHash: string) {
  if (!/^[0-9a-f]{64}$/.test(expectedHash) || !/^\d{6}$/.test(code)) return false;
  const actual = hashQrOtpCode(code, reservationId, key);
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function qrOtpMessage(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Código OTP inválido.');
  return `Clube Cupim: seu código de verificação é ${code}. Válido por 10 minutos. Não compartilhe.`;
}

export function qrOtpExpiry(nowMs: number) {
  if (!Number.isFinite(nowMs)) throw new Error('Horário OTP inválido.');
  return new Date(nowMs + OTP_LIFETIME_MS).toISOString();
}
