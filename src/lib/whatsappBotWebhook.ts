import { equalSecret, extractBotReplies, validMetaSignature, type BotConfig, type BotReply } from './whatsappBotCore.ts';

export function verifyBotWebhook(request: Request, config: BotConfig) {
  const params = new URL(request.url).searchParams;
  const challenge = params.get('hub.challenge');
  if (params.get('hub.mode') !== 'subscribe' || !equalSecret(config.verifyToken, params.get('hub.verify_token')) || !challenge || !/^\d{1,100}$/.test(challenge)) {
    return new Response('Verificação recusada.', { status: 403 });
  }
  return new Response(challenge, { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
}

async function limitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Corpo ausente.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 256 * 1024) { await reader.cancel(); throw new Error('Limite excedido.'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

/** ACK só após persistência; não transforma resposta recebida em entrega confirmada. */
export async function receiveBotWebhook(request: Request, config: BotConfig, persist: (replies: BotReply[]) => Promise<void>) {
  if (config.mode !== 'test' || !config.phoneNumberId || !config.appSecret || !config.identifierSecret || !config.testRecipients) {
    return new Response('Canal não habilitado.', { status: 503 });
  }
  let body: Buffer;
  try { body = await limitedBody(request); } catch { return new Response('Corpo inválido ou excedido.', { status: 413 }); }
  if (!validMetaSignature(body, request.headers.get('x-hub-signature-256'), config.appSecret)) {
    return new Response('Assinatura inválida.', { status: 401 });
  }
  let replies: BotReply[];
  try { replies = extractBotReplies(JSON.parse(body.toString('utf8')), config); }
  catch { return new Response('Evento inválido.', { status: 400 }); }
  if (replies.length) {
    try { await persist(replies); }
    catch { return new Response('Não foi possível registrar a resposta.', { status: 503 }); }
  }
  return Response.json({ ok: true });
}
