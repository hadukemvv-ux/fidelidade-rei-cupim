import { createHmac } from 'node:crypto';

export function normalizeBrazilPhone(value: string) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (!/^\d{10,11}$/.test(digits)) throw new Error('WhatsApp inválido. Use DDD e número.');
  return { local: digits, e164: `+55${digits}` };
}

export function privateIdentifier(value: string, secret: string) {
  if (!secret) throw new Error('Segredo do servidor não configurado.');
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function isPhoneInBetaList(phone: string, rawAllowedList: string, betaOnly = true) {
  if (!betaOnly) return true;
  const allowed = rawAllowedList
    .split(',')
    .map((item) => item.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''))
    .filter(Boolean);
  return allowed.includes(normalizeBrazilPhone(phone).local);
}
