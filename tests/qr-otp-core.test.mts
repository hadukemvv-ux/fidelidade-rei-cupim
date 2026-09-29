import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';

import {
  qrOtpSecrets, qrOtpEnabled, sealQrOtpPhone, openQrOtpPhone,
  newQrOtpCode, hashQrOtpCode, matchesQrOtpCode, qrOtpMessage, qrOtpExpiry,
} from '../src/lib/qrOtpCore.ts';

const reservationId = '209120b9-df7e-4c9c-a96c-a64a5e4fd497';
const anotherId = '309120b9-df7e-4c9c-a96c-a64a5e4fd497';
const phone = '+5585988887777';
const encryptionKey = randomBytes(32);
const codeKey = randomBytes(32);

test('QR OTP só libera com três travas explícitas; Twilio continua padrão', () => {
  assert.equal(qrOtpEnabled({}), false);
  assert.equal(qrOtpEnabled({ WHATSAPP_OTP_ENABLED: 'true', WHATSAPP_OTP_PROVIDER: 'twilio', WHATSAPP_QR_OTP_ENABLED: 'true' }), false);
  assert.equal(qrOtpEnabled({ WHATSAPP_OTP_ENABLED: 'true', WHATSAPP_OTP_PROVIDER: 'qr' }), false);
  assert.equal(qrOtpEnabled({ WHATSAPP_OTP_ENABLED: 'true', WHATSAPP_OTP_PROVIDER: 'qr', WHATSAPP_QR_OTP_ENABLED: 'true' }), true);
});

test('exige duas chaves aleatórias distintas e canônicas, sem aceitar placeholder', () => {
  assert.throws(() => qrOtpSecrets({}));
  assert.throws(() => qrOtpSecrets({ WHATSAPP_QR_OTP_ENCRYPTION_KEY: 'secret', WHATSAPP_QR_OTP_CODE_KEY: codeKey.toString('base64url') }));
  assert.throws(() => qrOtpSecrets({ WHATSAPP_QR_OTP_ENCRYPTION_KEY: encryptionKey.toString('base64url'), WHATSAPP_QR_OTP_CODE_KEY: encryptionKey.toString('base64url') }));
  const secrets = qrOtpSecrets({ WHATSAPP_QR_OTP_ENCRYPTION_KEY: encryptionKey.toString('base64url'), WHATSAPP_QR_OTP_CODE_KEY: codeKey.toString('base64url') });
  assert.deepEqual(secrets, { encryptionKey, codeKey });
});

test('destino criptografado varia por emissão e fica vinculado à reserva certa', () => {
  const sealed1 = sealQrOtpPhone(phone, reservationId, encryptionKey);
  const sealed2 = sealQrOtpPhone(phone, reservationId, encryptionKey);
  assert.notEqual(sealed1, sealed2);
  assert.equal(sealed1.includes(phone), false);
  assert.equal(openQrOtpPhone(sealed1, reservationId, encryptionKey), phone);
  assert.throws(() => openQrOtpPhone(sealed1, anotherId, encryptionKey));
  assert.throws(() => openQrOtpPhone(sealed1, reservationId, randomBytes(32)));
  assert.throws(() => openQrOtpPhone(`${sealed1}x`, reservationId, encryptionKey));
  assert.throws(() => sealQrOtpPhone('123', reservationId, encryptionKey));
});

test('código de seis dígitos usa sorteio criptográfico, hash privado e comparação segura', () => {
  const code = newQrOtpCode();
  assert.match(code, /^\d{6}$/);
  const hash = hashQrOtpCode(code, reservationId, codeKey);
  assert.equal(hash.includes(code), false);
  assert.equal(matchesQrOtpCode(code, reservationId, codeKey, hash), true);
  assert.equal(matchesQrOtpCode(code, anotherId, codeKey, hash), false);
  assert.equal(matchesQrOtpCode('999999', reservationId, codeKey, hash), code === '999999');
  assert.equal(matchesQrOtpCode('not-code', reservationId, codeKey, hash), false);
  assert.equal(matchesQrOtpCode(code, reservationId, codeKey, 'bad'), false);
  assert.notEqual(hashQrOtpCode(code, anotherId, codeKey), hash);
});

test('mensagem é estritamente transacional e expira em dez minutos', () => {
  assert.match(qrOtpMessage('000123'), /000123.*10 minutos/);
  assert.doesNotMatch(qrOtpMessage('000123'), /promo|desconto|oferta/i);
  assert.throws(() => qrOtpMessage('abc'));
  assert.equal(qrOtpExpiry(Date.parse('2026-09-29T12:00:00.000Z')), '2026-09-29T12:10:00.000Z');
});
