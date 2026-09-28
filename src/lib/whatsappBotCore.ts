import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { normalizeBrazilPhone, isPhoneInBetaList } from './otpCore.ts';

export type BotConfig = {
  mode: 'disabled' | 'test';
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  appSecret: string;
  verifyToken: string;
  identifierSecret: string;
  testRecipients: string;
};

export function botConfig(env: Record<string, string | undefined>): BotConfig {
  return {
    // Produção permanece bloqueada nesta primeira etapa.
    mode: env.WHATSAPP_BOT_MODE === 'test' ? 'test' : 'disabled',
    phoneNumberId: env.WHATSAPP_META_PHONE_NUMBER_ID || '',
    accessToken: env.WHATSAPP_META_ACCESS_TOKEN || '',
    apiVersion: env.WHATSAPP_META_API_VERSION || '',
    appSecret: env.WHATSAPP_META_APP_SECRET || '',
    verifyToken: env.WHATSAPP_META_VERIFY_TOKEN || '',
    identifierSecret: env.WHATSAPP_BOT_IDENTIFIER_SECRET || '',
    testRecipients: env.WHATSAPP_BOT_TEST_RECIPIENTS || '',
  };
}

export function equalSecret(expected: string, received: string | null) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validMetaSignature(body: Uint8Array, signature: string | null, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return equalSecret(expected, signature.slice(7));
}

export type BotReply = {
  message_id: string;
  sender_hash: string;
  choice_hash: string;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Só escolhas opacas do Clube entram. Texto, nomes, mídia e telefone bruto são descartados. */
export function extractBotReplies(payload: unknown, config: BotConfig): BotReply[] {
  if (!config.identifierSecret) throw new Error('Segredo do bot ausente.');
  const root = object(payload);
  if (root.object !== 'whatsapp_business_account') throw new Error('Evento incompatível.');
  const replies = new Map<string, BotReply>();
  for (const entry of Array.isArray(root.entry) ? root.entry : []) {
    for (const change of Array.isArray(object(entry).changes) ? object(entry).changes as unknown[] : []) {
      const delta = object(change);
      const value = object(delta.value);
      if (delta.field !== 'messages' || object(value.metadata).phone_number_id !== config.phoneNumberId) continue;
      for (const raw of Array.isArray(value.messages) ? value.messages : []) {
        const message = object(raw);
        if (typeof message.id !== 'string' || !message.id || message.id.length > 256 || typeof message.from !== 'string') continue;
        let sender: string;
        try {
          sender = normalizeBrazilPhone(message.from).local;
          if (!isPhoneInBetaList(sender, config.testRecipients, true)) continue;
        } catch { continue; }
        const interactive = object(message.interactive);
        const reply = interactive.type === 'button_reply' ? object(interactive.button_reply)
          : interactive.type === 'list_reply' ? object(interactive.list_reply) : {};
        const choice = message.type === 'interactive' ? reply.id
          : message.type === 'button' ? object(message.button).payload : null;
        if (typeof choice !== 'string' || !/^cc:[A-Za-z0-9_-]{32,64}$/.test(choice)) continue;
        replies.set(message.id, {
          message_id: message.id,
          sender_hash: createHmac('sha256', config.identifierSecret).update(`staff:55${sender}`).digest('hex'),
          choice_hash: createHash('sha256').update(choice).digest('hex'),
        });
        if (replies.size > 50) throw new Error('Lote de respostas excedido.');
      }
    }
  }
  return [...replies.values()];
}

/** Smoke test somente: um template fixo, lista fechada e sem retentativa automática. */
export async function sendBotSmokeTest(config: BotConfig, recipient: string, transport: typeof fetch = fetch) {
  if (config.mode !== 'test') throw new Error('Bot desligado.');
  if (!/^\d+$/.test(config.phoneNumberId) || !/^v\d+\.0$/.test(config.apiVersion) || !config.accessToken) {
    throw new Error('Remetente da Meta não configurado.');
  }
  const phone = normalizeBrazilPhone(recipient);
  if (!isPhoneInBetaList(phone.local, config.testRecipients, true)) throw new Error('Destinatário fora do teste.');
  let response: Response;
  try {
    response = await transport(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone.e164.slice(1), type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } }),
      cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
  } catch {
    // O fornecedor pode ter aceitado antes de a conexão cair: não reenviar cegamente.
    throw new Error('Resultado do envio desconhecido. Confira o provedor antes de repetir.');
  }
  if (!response.ok) throw new Error(`A Meta recusou o teste (HTTP ${response.status}).`);
  const data = object(await response.json().catch(() => null));
  const id = object(Array.isArray(data.messages) ? data.messages[0] : null).id;
  if (typeof id !== 'string' || !id) throw new Error('Resultado do envio desconhecido. Confira o provedor antes de repetir.');
  return { accepted: true, messageId: id };
}
