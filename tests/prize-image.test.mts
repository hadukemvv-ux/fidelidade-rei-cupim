import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { MAX_PRIZE_IMAGE_UPLOAD, preparePrizeImage, prizeImagePath, prizeImageUrl } from '../src/lib/prizeImage.ts';
import { uploadPrizeImage, type PrizeImageStore } from '../src/lib/prizeImageUpload.ts';

const actor = { userId: randomUUID(), papel: 'superadmin' };
const fixture = () => sharp({ create: { width: 1600, height: 900, channels: 3, background: '#d94a29' } }).jpeg().withMetadata().toBuffer();
function request(bytes: Uint8Array, mime = 'image/jpeg') {
  const form = new FormData(); form.append('foto', new File([bytes as BlobPart], 'not-trusted-name.jpg', { type: mime }));
  return new Request('https://clubecupim.example/api/admin/premios/1/imagem', { method: 'POST', body: form });
}
function store(overrides: Partial<PrizeImageStore> = {}): PrizeImageStore {
  return { current: async () => ({ imagem_url: null }), upload: async () => {}, commit: async () => ({ ok: true }), ...overrides };
}
test('foto é decodificada, reduzida, convertida em WebP e tem metadados removidos', async () => {
  const image = await preparePrizeImage(await fixture(), 'image/jpeg');
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 1024);
  assert.ok((metadata.height || 0) <= 1024); assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
});
test('aceita PNG/WebP reais e recusa WebP animado', async () => {
  for (const format of ['png', 'webp'] as const) {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 4, background: '#aabbcc88' } }).toFormat(format).toBuffer();
    assert.equal((await sharp(await preparePrizeImage(bytes, `image/${format}`)).metadata()).format, 'webp');
  }
  const frames = await Promise.all(['red', 'blue'].map(background =>
    sharp({ create: { width: 16, height: 16, channels: 4, background } }).png().toBuffer()));
  const animated = await sharp(frames, { join: { animated: true } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  await assert.rejects(preparePrizeImage(animated, 'image/webp'), /sem animação/);
});
test('rejeita arquivo grande, SVG/GIF, MIME adulterado e conteúdo corrompido', async () => {
  const jpeg = await fixture();
  for (const [bytes, mime] of [[Buffer.alloc(MAX_PRIZE_IMAGE_UPLOAD + 1), 'image/jpeg'], [jpeg, 'image/png'],
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/png'], [jpeg, 'image/svg+xml'],
    [jpeg, 'image/gif'], [Buffer.from([255, 216, 255, 0]), 'image/jpeg']] as const) await assert.rejects(preparePrizeImage(bytes, mime));
  const large = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(preparePrizeImage(large, 'image/png'), /16 megapixels/);
});
test('destino da foto ignora nome original e só usa bucket/projeto autorizados', () => {
  const id = randomUUID(), path = prizeImagePath(1, id);
  assert.equal(path, `roleta/1/${id}.webp`);
  assert.equal(prizeImageUrl(path), `https://asjoubgoccbvftyggunz.supabase.co/storage/v1/object/public/premios/${path}`);
  for (const path of ['../comandas/photo.webp', 'https://evil.example/x', 'roleta/0/x.webp']) assert.throws(() => prizeImageUrl(path));
});
test('permissões, origem, corpo excessivo e campos extras bloqueiam antes do armazenamento', async () => {
  let calls = 0; const dependency = store({ current: async () => { calls++; return null; } });
  const bytes = await fixture();
  assert.equal((await uploadPrizeImage(request(bytes), { ...actor, papel: 'gestor' }, 1, dependency)).status, 403);
  assert.equal((await uploadPrizeImage(request(bytes), actor, NaN, dependency)).status, 400);
  const cross = request(bytes); cross.headers.set('origin', 'https://evil.example');
  assert.equal((await uploadPrizeImage(cross, actor, 1, dependency)).status, 403);
  const huge = request(bytes); huge.headers.set('content-length', String(MAX_PRIZE_IMAGE_UPLOAD + 32_769));
  assert.equal((await uploadPrizeImage(huge, actor, 1, dependency)).status, 413);
  const form = new FormData(); form.append('foto', new File([bytes], 'a.jpg', { type: 'image/jpeg' })); form.append('actor_id', 'forged');
  assert.equal((await uploadPrizeImage(new Request('https://clubecupim.example', { method: 'POST', body: form }), actor, 1, dependency)).status, 400);
  assert.equal(calls, 0);
});
test('upload precede RPC; apenas ator autenticado e referência anterior são enviados', async () => {
  const sequence: string[] = [];
  const result = await uploadPrizeImage(request(await fixture()), actor, 1, store({
    current: async () => { sequence.push('read'); return { imagem_url: '/produtos/pudim.png' }; },
    upload: async (path, bytes) => { sequence.push('upload'); assert.match(path, /^roleta\/1\/.+\.webp$/); assert.equal((await sharp(bytes).metadata()).format, 'webp'); },
    commit: async input => { sequence.push('commit'); assert.equal(input.actorId, actor.userId); assert.equal(input.previousUrl, '/produtos/pudim.png'); return { ok: true }; },
  }));
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await result.json()).ok, true); assert.deepEqual(sequence, ['read', 'upload', 'commit']);
});
test('corpo sem Content-Length também é limitado enquanto chega, antes de parsear o formulário', async () => {
  let cancelled = false, calls = 0;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_PRIZE_IMAGE_UPLOAD + 32_769)); },
    cancel() { cancelled = true; } });
  const input = new Request('https://clubecupim.example', { method: 'POST', body,
    headers: { 'Content-Type': 'multipart/form-data; boundary=fixture' }, duplex: 'half' } as RequestInit & { duplex: string });
  const result = await uploadPrizeImage(input, actor, 1, store({ current: async () => { calls++; return null; } }));
  assert.equal(result.status, 413); assert.equal(cancelled, true); assert.equal(calls, 0);
});
test('foto não é enviada sem prêmio; falha ou conflito não retenta nem oculta incerteza', async () => {
  const bytes = await fixture(); let uploads = 0, commits = 0;
  const dependency = store({ upload: async () => { uploads++; }, commit: async () => { commits++; throw new Error('private token'); } });
  assert.equal((await uploadPrizeImage(request(bytes), actor, 1, store({ ...dependency, current: async () => null }))).status, 404);
  assert.equal(uploads, 0);
  const error = await uploadPrizeImage(request(bytes), actor, 1, dependency);
  assert.equal(error.status, 503); assert.equal((await error.text()).includes('private'), false);
  assert.equal(uploads, 1); assert.equal(commits, 1);
  assert.equal((await uploadPrizeImage(request(bytes), actor, 1, store({ commit: async () => ({ ok: false, motivo: 'Atualize.' }) }))).status, 409);
});
