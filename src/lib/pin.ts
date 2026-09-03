import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PIN_PATTERN = /^\d{4}$/;
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function derivePin(pin: string, salt: Buffer, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPin(pin: string) {
  if (!PIN_PATTERN.test(pin)) throw new Error('PIN deve ter exatamente 4 dígitos.');
  const salt = randomBytes(16);
  const key = await derivePin(pin, salt);
  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export type PinVerification = { valid: boolean; needsRehash: boolean };

export async function verifyPin(pin: string, storedHash?: string | null): Promise<PinVerification> {
  if (!PIN_PATTERN.test(pin) || !storedHash) return { valid: false, needsRehash: false };

  if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [prefix, nRaw, rRaw, pRaw, saltRaw, keyRaw] = storedHash.split('$');
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (prefix !== SCRYPT_PREFIX || !n || !r || !p || !saltRaw || !keyRaw) {
      return { valid: false, needsRehash: false };
    }

    try {
      const expected = Buffer.from(keyRaw, 'base64url');
      const actual = await derivePin(pin, Buffer.from(saltRaw, 'base64url'), n, r, p);
      return {
        valid: expected.length === actual.length && timingSafeEqual(expected, actual),
        needsRehash: n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P,
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Compatibilidade temporária: migra o SHA-256 legado após um login válido.
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacy = createHash('sha256').update(pin).digest();
    const expected = Buffer.from(storedHash, 'hex');
    return {
      valid: expected.length === legacy.length && timingSafeEqual(expected, legacy),
      needsRehash: true,
    };
  }

  return { valid: false, needsRehash: false };
}

export function isLegacyAutomaticPin(telefone?: string | null, storedHash?: string | null) {
  if (!telefone || telefone.length < 4 || !storedHash) return false;
  const automaticHash = createHash('sha256').update(telefone.substring(0, 4)).digest('hex');
  const current = Buffer.from(storedHash);
  const automatic = Buffer.from(automaticHash);
  return current.length === automatic.length && timingSafeEqual(current, automatic);
}
