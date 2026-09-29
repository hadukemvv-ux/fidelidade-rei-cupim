// Copia os arquivos do Supabase Storage para uma pasta local.
// Uso: node scripts/backup-storage.mjs <pasta-de-saida>
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.
// Roda no GitHub Actions (.github/workflows/backup-supabase.yml).
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Fotos de comanda expiram em 36 horas pela política de privacidade;
// guardá-las em backup de 30 dias contrariaria essa retenção.
const EXCLUDED_BUCKETS = new Set(['comandas-roleta']);
const PAGE_SIZE = 1000;

async function listFiles(storage, bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(`Falha ao listar ${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Pastas vêm sem id; arquivos têm id.
      if (item.id) files.push(itemPath);
      else files.push(...(await listFiles(storage, bucket, itemPath)));
    }
    if (data.length < PAGE_SIZE) return files;
  }
}

async function main() {
  const outputDir = process.argv[2];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!outputDir) throw new Error('Informe a pasta de saída.');
  if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');

  const { storage } = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: buckets, error } = await storage.listBuckets();
  if (error) throw new Error(`Falha ao listar buckets: ${error.message}`);

  const manifest = { createdAt: new Date().toISOString(), buckets: {} };
  for (const bucket of buckets) {
    if (EXCLUDED_BUCKETS.has(bucket.name)) {
      manifest.buckets[bucket.name] = { skipped: 'retenção curta (privacidade)' };
      continue;
    }
    const files = await listFiles(storage, bucket.name);
    const entries = [];
    for (const file of files) {
      const { data, error: downloadError } = await storage.from(bucket.name).download(file);
      if (downloadError) throw new Error(`Falha ao baixar ${bucket.name}/${file}: ${downloadError.message}`);
      const bytes = Buffer.from(await data.arrayBuffer());
      const target = path.join(outputDir, bucket.name, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
      entries.push({ file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
    manifest.buckets[bucket.name] = { public: bucket.public, files: entries.length, entries };
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  for (const [name, info] of Object.entries(manifest.buckets)) {
    console.log(`${name}: ${info.skipped ? `ignorado (${info.skipped})` : `${info.files} arquivo(s)`}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
