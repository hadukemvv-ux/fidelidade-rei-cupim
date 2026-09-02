import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const TABLES = [
  'base_clientes_saipos',
  'produtos_loja',
  'sorteios',
  'sorteios_logs',
  'sorteios_eventos',
  'vendas_processadas',
  'saipos_pedidos_processados',
  'saipos_cron_logs',
  'extrato_pontos',
  'creditos_qr',
  'resgates',
  'garcons',
  'garcons_logs',
  'premios_roleta',
  'historico_roleta',
  'sorteios_ganhadores',
  'cupons_resgatados',
  'view_saldo_clientes',
];

async function readEnv() {
  const contents = await fs.readFile('.env.local', 'utf8');
  return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) return [];
    return [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]];
  }));
}

async function resolvePublicIpv4(hostname) {
  const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`);
  if (!response.ok) throw new Error(`Falha ao consultar DNS público: HTTP ${response.status}`);
  const data = await response.json();
  const address = data.Answer?.find((answer) => answer.type === 1)?.data;
  if (!address) throw new Error(`O DNS público não retornou IPv4 para ${hostname}`);
  return address;
}

function requestJson({ hostname, ip, requestPath, serviceKey, headers = {} }) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: ip,
      servername: hostname,
      path: requestPath,
      method: 'GET',
      rejectUnauthorized: true,
      headers: {
        Host: hostname,
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        ...headers,
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json;
        try { json = body ? JSON.parse(body) : null; } catch { json = body; }
        resolve({ status: response.statusCode ?? 0, headers: response.headers, json });
      });
    });
    request.on('error', reject);
    request.end();
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function main() {
  const env = await readEnv();
  const baseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl.hostname || !serviceKey) throw new Error('Credenciais do Supabase ausentes em .env.local');

  const ip = await resolvePublicIpv4(baseUrl.hostname);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve('backups', `supabase-${stamp}`);
  await fs.mkdir(outputDir, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    projectHost: baseUrl.hostname,
    kind: 'pre-migration-logical-snapshot',
    tables: {},
  };

  const openApi = await requestJson({
    hostname: baseUrl.hostname,
    ip,
    requestPath: '/rest/v1/',
    serviceKey,
    headers: { Accept: 'application/openapi+json' },
  });
  if (openApi.status !== 200) throw new Error(`Falha ao exportar OpenAPI: HTTP ${openApi.status}`);
  const openApiText = JSON.stringify(openApi.json, null, 2);
  await fs.writeFile(path.join(outputDir, 'openapi.json'), openApiText, 'utf8');
  manifest.openapiSha256 = sha256(openApiText);

  for (const table of TABLES) {
    const rows = [];
    const pageSize = 1000;
    for (let start = 0; ; start += pageSize) {
      const response = await requestJson({
        hostname: baseUrl.hostname,
        ip,
        requestPath: `/rest/v1/${encodeURIComponent(table)}?select=*`,
        serviceKey,
        headers: { Range: `${start}-${start + pageSize - 1}`, Prefer: 'count=exact' },
      });
      if (response.status === 404) {
        manifest.tables[table] = { available: false, rows: 0 };
        break;
      }
      if (response.status !== 200 && response.status !== 206) {
        throw new Error(`Falha ao exportar ${table}: HTTP ${response.status}`);
      }
      const page = Array.isArray(response.json) ? response.json : [];
      rows.push(...page);
      if (page.length < pageSize) {
        const text = JSON.stringify(rows, null, 2);
        await fs.writeFile(path.join(outputDir, `${table}.json`), text, 'utf8');
        manifest.tables[table] = { available: true, rows: rows.length, sha256: sha256(text) };
        break;
      }
    }
  }

  const manifestText = JSON.stringify(manifest, null, 2);
  await fs.writeFile(path.join(outputDir, 'manifest.json'), manifestText, 'utf8');
  console.log(JSON.stringify({ outputDir, tables: manifest.tables }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
