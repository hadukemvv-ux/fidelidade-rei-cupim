import { randomUUID } from 'node:crypto';
import { MAX_PRIZE_IMAGE_UPLOAD, PrizeImageInputError, preparePrizeImage, prizeImagePath, prizeImageUrl } from './prizeImage.ts';

type Actor = { userId: string; papel: string };
export type PrizeImageStore = {
  current(id: number): Promise<{ imagem_url: string | null } | null>;
  upload(path: string, image: Uint8Array): Promise<void>;
  commit(input: { prizeId: number; actorId: string; url: string; previousUrl: string | null }): Promise<{ ok: boolean; motivo?: string }>;
};
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** Auth precedes body parsing. Storage and DB aren't one transaction: preserve
 * uploaded candidates on uncertain failure, never delete or blindly resend. */
export async function uploadPrizeImage(request: Request, actor: Actor, prizeId: number, store: PrizeImageStore) {
  if (actor.papel !== 'superadmin') return response({ error: 'Sem permissão para trocar fotos.' }, 403);
  if (!Number.isSafeInteger(prizeId) || prizeId <= 0) return response({ error: 'Prêmio inválido.' }, 400);
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return response({ error: 'Origem inválida.' }, 403);
  try {
    const type = request.headers.get('content-type') || '';
    if (!/^multipart\/form-data;\s*boundary=/i.test(type)) throw new PrizeImageInputError('Envie a foto como multipart/form-data.');
    const limit = MAX_PRIZE_IMAGE_UPLOAD + 32_768;
    const length = request.headers.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new PrizeImageInputError('Envie uma foto de até 2 MB.', 413);
    const reader = request.body?.getReader();
    if (!reader) throw new PrizeImageInputError('Selecione uma foto.');
    const chunks: Uint8Array[] = []; let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        total += value.length;
        if (total > limit) { await reader.cancel(); throw new PrizeImageInputError('Envie uma foto de até 2 MB.', 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let form: FormData;
    try { form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': type } }).formData(); }
    catch { throw new PrizeImageInputError('Não foi possível ler o arquivo enviado.'); }
    const entries = [...form.entries()];
    if (entries.length !== 1 || entries[0][0] !== 'foto' || !(entries[0][1] instanceof File)) throw new PrizeImageInputError('Envie somente um arquivo no campo foto.');
    const file = entries[0][1];
    if (file.size > MAX_PRIZE_IMAGE_UPLOAD) throw new PrizeImageInputError('Envie uma foto de até 2 MB.', 413);
    const image = await preparePrizeImage(new Uint8Array(await file.arrayBuffer()), file.type);
    const current = await store.current(prizeId);
    if (!current) return response({ error: 'Prêmio não encontrado.' }, 404);
    const path = prizeImagePath(prizeId, randomUUID());
    const url = prizeImageUrl(path);
    await store.upload(path, image); // Unique immutable object; never overwrite.
    const result = await store.commit({ prizeId, actorId: actor.userId, url, previousUrl: current.imagem_url });
    if (!result.ok) return response({ error: result.motivo || 'Não foi possível vincular a foto. Atualize o painel antes de tentar novamente.' }, 409);
    return response({ ok: true, data: { premio_id: prizeId, imagem_url: url } });
  } catch (error) {
    if (error instanceof PrizeImageInputError) return response({ error: error.message }, error.status);
    return response({ error: 'Não foi possível confirmar a troca da foto. Atualize o painel antes de tentar novamente.' }, 503);
  }
}
