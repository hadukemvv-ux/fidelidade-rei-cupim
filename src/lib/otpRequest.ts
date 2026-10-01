export class OtpRequestError extends Error {
  readonly status: 400 | 413;
  constructor(status: 400 | 413 = 400) { super('Requisição OTP inválida.'); this.status = status; }
}

export async function readOtpJson(request: Request): Promise<unknown> {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site' ||
    !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new OtpRequestError();
  if (Number(request.headers.get('content-length') || 0) > 1024) throw new OtpRequestError(413);
  if (!request.body) throw new OtpRequestError();
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); throw new OtpRequestError(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new OtpRequestError(); } // No raw parse error/body in logs.
}

export function otpNoStore<T extends Response>(response: T): T {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
