import { createHmac } from 'node:crypto';

export const CONNECTION_TEST_TEXT = 'Clube Cupim: conexão de teste funcionando. Nenhuma campanha foi ativada.';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

async function resolveRecipient(socket, recipient, timeoutMs) {
  let timer;
  try {
    // Query only the supplied, allowlisted number. Never probe nearby numbers.
    const rows = await Promise.race([
      socket.onWhatsApp(recipient),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Lookup timeout')), timeoutMs); }),
    ]);
    const matches = Array.isArray(rows) ? rows.filter(row => row?.exists === true) : [];
    if (matches.length !== 1 || typeof matches[0].jid !== 'string') throw new Error('Recipient unavailable');
    const digits = recipient.slice(1);
    const direct = `${digits}@s.whatsapp.net`;
    const brazilMobile = digits.length === 13 && digits[4] === '9';
    const withoutNinth = brazilMobile ? `${digits.slice(0, 4)}${digits.slice(5)}@s.whatsapp.net` : undefined;
    // The shortened variant is a validation boundary, NOT a generated target.
    // Only use the actual account address returned by WhatsApp for this lookup.
    if (matches[0].jid !== direct && matches[0].jid !== withoutNinth) throw new Error('Unexpected recipient');
    return matches[0].jid;
  } finally { clearTimeout(timer); }
}

// No generic text, media, group, scheduling, OTP or commercial mode.
export function createTestSender({ env, store, controller, timeoutMs = 8000 }) {
  const keyHex = env.WHATSAPP_QR_SESSION_KEY || '';
  const allowed = (env.WHATSAPP_QR_TEST_RECIPIENTS || '').split(',').map(v => v.trim()).filter(Boolean);
  const approvedRequestId = env.WHATSAPP_QR_TEST_APPROVED_REQUEST_ID?.toLowerCase();
  const enabled = env.WHATSAPP_QR_SEND_MODE === 'test' && /^[a-f0-9]{64}$/i.test(keyHex) &&
    allowed.length > 0 && allowed.length <= 3 && allowed.every(v => /^\+55\d{10,11}$/.test(v)) &&
    (approvedRequestId === undefined || uuid.test(approvedRequestId));
  return {
    enabled,
    async send(input) {
      if (!enabled) throw new Error('Test sending disabled');
      if (!input || Object.keys(input).sort().join(',') !== 'recipient,request_id' || typeof input.request_id !== 'string' || !uuid.test(input.request_id) ||
        typeof input.recipient !== 'string' || !allowed.includes(input.recipient)) throw new Error('Invalid test request');
      const id = input.request_id.toLowerCase();
      if (approvedRequestId && id !== approvedRequestId) throw new Error('Invalid approved test request');
      const hash = createHmac('sha256', Buffer.from(keyHex, 'hex')).update(`clube-cupim/test-recipient/v1/${input.recipient}`).digest('hex');
      return controller.runConnected(async socket => {
        const jid = await resolveRecipient(socket, input.recipient, timeoutMs);
        const reservation = await store.reserveTestSend(id, hash, approvedRequestId);
        if (!reservation.reserved) return { status: reservation.status, duplicate: true };
        let timer;
        try {
          const result = await Promise.race([
            socket.sendMessage(jid, { text: CONNECTION_TEST_TEXT }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs); }),
          ]);
          if (!result?.key?.id) throw new Error('No acceptance');
          await store.finishTestSend(id, 'accepted');
          // Socket acceptance is not delivery/read confirmation.
          return { status: 'accepted', duplicate: false };
        } catch {
          // Network may have accepted the message. Never resend on uncertainty.
          try { await store.finishTestSend(id, 'unknown'); } catch { /* pending is also unknown */ }
          return { status: 'unknown', duplicate: false };
        } finally { clearTimeout(timer); }
      });
    },
  };
}
