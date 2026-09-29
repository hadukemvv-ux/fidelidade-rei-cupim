import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

export function createControlServer(controller, token) {
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error('Invalid control token');
  const expected = createHash('sha256').update(`Bearer ${token}`).digest();
  return createServer({ maxHeaderSize: 4096, requestTimeout: 10_000, headersTimeout: 5000 }, async (req, res) => {
    const reply = (code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    if (!timingSafeEqual(expected, createHash('sha256').update(req.headers.authorization || '').digest())) {
      reply(401, { error: 'Unauthorized' }); return;
    }
    // Browser requests never talk directly to the worker. No CORS or cookies.
    if (req.headers.origin || req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) > 0) {
      reply(400, { error: 'Invalid request' }); return;
    }
    try {
      if (req.method === 'GET' && req.url === '/session') reply(200, controller.snapshot());
      else if (req.method === 'POST' && ['/session/connect', '/session/disconnect'].includes(req.url)) {
        reply(200, await controller.command(req.url.split('/').at(-1)));
      } else reply(404, { error: 'Not found' });
    } catch { reply(503, { error: 'Session unavailable' }); }
  });
}
