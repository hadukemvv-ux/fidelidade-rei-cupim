import { createHmac } from 'node:crypto';
import { resolveRecipient } from './test-send.mjs';

// Closed beta only. No arbitrary text, campaigns, groups or incoming messages.
export function createOtpSender({ env, store, controller, timeoutMs = 8000, now = Date.now }) {
  const allowed = (env.WHATSAPP_QR_OTP_RECIPIENTS || '').split(',').map(v => v.trim()).filter(Boolean);
  const key = env.WHATSAPP_QR_SESSION_KEY || '';
  const token = env.WHATSAPP_QR_OTP_TOKEN || '';
  const enabled = env.WHATSAPP_QR_OTP_ENABLED === 'true' && /^[a-f0-9]{64}$/i.test(key) &&
    /^[a-f0-9]{64}$/i.test(token) && token.toLowerCase() !== key.toLowerCase() &&
    token.toLowerCase() !== (env.WHATSAPP_QR_CONTROL_TOKEN || '').toLowerCase() &&
    allowed.length > 0 && allowed.length <= 3 && allowed.every(v => /^\+55\d{10,11}$/.test(v));
  return {
    enabled,
    async send(input) {
      if (!enabled) throw new Error('OTP disabled');
      if (!input || Object.keys(input).sort().join(',') !== 'code,expires_at,recipient,request_id' ||
        typeof input.request_id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.request_id) ||
        typeof input.recipient !== 'string' || !allowed.includes(input.recipient) ||
        typeof input.code !== 'string' || !/^\d{6}$/.test(input.code) || typeof input.expires_at !== 'string') throw new Error('Invalid OTP');
      const expiry = Date.parse(input.expires_at);
      const validTime = () => Number.isFinite(expiry) && expiry > now() && expiry <= now() + 600_000 &&
        new Date(expiry).toISOString() === input.expires_at;
      if (!validTime()) throw new Error('Expired OTP');
      const hmac = value => createHmac('sha256', Buffer.from(key, 'hex')).update(value).digest('hex');
      const fingerprint = hmac(`clube-cupim/otp-payload/v1/${JSON.stringify([input.request_id, input.recipient, input.code, input.expires_at])}`);
      const phoneHash = hmac(`clube-cupim/otp-phone/v1/${input.recipient}`);
      return controller.runConnected(async socket => {
        if (!validTime()) throw new Error('Expired OTP');
        // Reserve before any provider call: duplicate/quota exhaustion must not
        // keep probing the account, even when lookup itself fails or times out.
        const reservation = await store.reserveOtpSend(input.request_id, fingerprint, phoneHash, now());
        if (!reservation.reserved) return { status: reservation.status, duplicate: true };
        let timer;
        try {
          const jid = await resolveRecipient(socket, input.recipient, timeoutMs);
          if (!validTime()) throw new Error('Expired OTP');
          const result = await Promise.race([
            socket.sendMessage(jid, { text: `Clube Cupim: seu código de verificação é ${input.code}. Válido por 10 minutos. Não compartilhe.` }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs); }),
          ]);
          if (!result?.key?.id) throw new Error('No acceptance');
          await store.finishOtpSend(input.request_id, 'accepted');
          return { status: 'accepted', duplicate: false }; // Not proof of delivery.
        } catch {
          try { await store.finishOtpSend(input.request_id, 'unknown'); } catch { /* pending also forbids replay */ }
          return { status: 'unknown', duplicate: false };
        } finally { clearTimeout(timer); }
      });
    },
  };
}
