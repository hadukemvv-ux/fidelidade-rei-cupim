import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

export function createControlServer(controller, token, testSender) {
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
    const testRoute = req.method === 'POST' && req.url === '/messages/test';
    if (req.headers.origin || (!testRoute && (req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) > 0))) {
      reply(400, { error: 'Invalid request' }); return;
    }
    try {
      if (testRoute) {
        if (!testSender?.enabled) { reply(503, { error: 'Test sending disabled' }); return; }
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) { reply(400, { error: 'Invalid request' }); return; }
        let body = '';
        for await (const part of req) {
          body += part.toString('utf8');
          if (Buffer.byteLength(body) > 512) { reply(413, { error: 'Request too large' }); return; }
        }
        let value;
        try { value = JSON.parse(body); } catch { reply(400, { error: 'Invalid request' }); return; }
        reply(200, await testSender.send(value));
      }
      else if (req.method === 'GET' && req.url === '/session') reply(200, controller.snapshot());
      else if (req.method === 'POST' && ['/session/connect', '/session/disconnect'].includes(req.url)) {
        reply(200, await controller.command(req.url.split('/').at(-1)));
      } else reply(404, { error: 'Not found' });
    } catch { reply(503, { error: 'Session unavailable' }); }
  });
}
