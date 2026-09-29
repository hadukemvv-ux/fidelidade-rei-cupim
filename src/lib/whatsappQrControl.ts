export type QrSession = {
  status: 'disconnected' | 'connecting' | 'qr' | 'connected' | 'disconnecting' | 'error';
  qr: string | null;
  qr_expires_at: string | null;
};

type Environment = Record<string, string | undefined>;
const headers = { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' };
export const qrControlResponse = (body: unknown, status = 200) => Response.json(body, { status, headers });

export function qrControlConfig(env: Environment) {
  if (env.WHATSAPP_QR_CONTROL_ENABLED !== 'true') return null;
  const token = env.WHATSAPP_QR_CONTROL_TOKEN || '';
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  try {
    const url = new URL(env.WHATSAPP_QR_CONTROL_URL || '');
    const local = env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return { origin: url.origin, token };
  } catch { return null; }
}

/** Only this server-side adapter sees the control secret. Never return upstream errors. */
export async function requestQrControl(env: Environment, action: 'status' | 'connect' | 'disconnect', transport: typeof fetch = fetch) {
  const config = qrControlConfig(env);
  if (!config) return qrControlResponse({ error: 'Conexão WhatsApp ainda não configurada.' }, 503);
  try {
    const result = await transport(`${config.origin}/session${action === 'status' ? '' : `/${action}`}`, {
      method: action === 'status' ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok || !result.body) throw new Error('Unavailable');
    // Reject an oversized response before buffering it (QR is usually < 1 KB).
    const reader = result.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); throw new Error('Too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const value = JSON.parse(Buffer.concat(chunks).toString()) as QrSession;
    if (!['disconnected', 'connecting', 'qr', 'connected', 'disconnecting', 'error'].includes(value.status)) throw new Error('Invalid state');
    let qr: string | null = null;
    let expiry: string | null = null;
    if (value.status === 'qr') {
      if (typeof value.qr !== 'string' || !value.qr.length || value.qr.length > 4096 || typeof value.qr_expires_at !== 'string') throw new Error('Invalid QR');
      const end = Date.parse(value.qr_expires_at);
      if (!Number.isFinite(end) || end > Date.now() + 60_000) throw new Error('Invalid expiry');
      if (end > Date.now()) { qr = value.qr; expiry = value.qr_expires_at; }
    }
    return qrControlResponse({ status: value.status === 'qr' && !qr ? 'connecting' : value.status, qr, qr_expires_at: expiry });
  } catch { return qrControlResponse({ error: 'Não foi possível acessar a conexão WhatsApp. Consulte o estado antes de repetir uma ação.' }, 503); }
}
