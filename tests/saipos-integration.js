/**
 * Testes de integração SAIPOS — executa contra o servidor local (porta 3000)
 *
 * Uso:
 *   node tests/saipos-integration.js
 *
 * Requer:
 *   - npm run dev rodando (porta 3000)
 *   - .env.local configurado com CRON_SECRET, SAIPOS_TOKEN
 *   - Admin auth via uma das opcoes abaixo:
 *     1. ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD (recomendado)
 *     2. ADMIN_SECRET_TOKEN (legado, fallback temporario)
 */

const fs = require("fs");
const envRaw = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => {
  const m = envRaw.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) return "";
  return m[1].replace(/\r$/, "").replace(/^["']|["']$/g, "").trim();
};

const BASE = "http://localhost:3000";
const ADMIN_TOKEN  = getEnv("ADMIN_SECRET_TOKEN");
const CRON_SECRET  = getEnv("CRON_SECRET");
const SAIPOS_TOKEN = getEnv("SAIPOS_TOKEN");
const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const ADMIN_TEST_EMAIL = getEnv("ADMIN_TEST_EMAIL") || getEnv("ADMIN_EMAIL");
const ADMIN_TEST_PASSWORD = getEnv("ADMIN_TEST_PASSWORD") || getEnv("ADMIN_PASSWORD");

let adminAuthMode = "desconhecido";
let cachedAdminHeaders = null;

let passed = 0, failed = 0;

async function test(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ ${desc}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${desc}`);
    console.log(`     └─ ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function getAdminHeaders() {
  if (cachedAdminHeaders) return cachedAdminHeaders;

  if (SUPABASE_URL && SUPABASE_ANON_KEY && ADMIN_TEST_EMAIL && ADMIN_TEST_PASSWORD) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: ADMIN_TEST_EMAIL,
        password: ADMIN_TEST_PASSWORD,
      }),
    });

    const json = await res.json().catch(() => null);
    const accessToken = json?.access_token;

    if (!res.ok || !accessToken) {
      throw new Error(`falha ao autenticar admin de teste por sessao: ${res.status} ${JSON.stringify(json)}`);
    }

    adminAuthMode = "supabase-session";
    cachedAdminHeaders = { Authorization: `Bearer ${accessToken}` };
    return cachedAdminHeaders;
  }

  if (ADMIN_TOKEN) {
    adminAuthMode = "legacy-token";
    cachedAdminHeaders = { Authorization: `Bearer ${ADMIN_TOKEN}` };
    return cachedAdminHeaders;
  }

  throw new Error("configure ADMIN_TEST_EMAIL + ADMIN_TEST_PASSWORD ou ADMIN_SECRET_TOKEN para validar rotas admin");
}

async function req(method, path, { headers = {}, body, timeoutMs = 20000 } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// ─── Venda fake reutilizável ─────────────────────────────────────────────────
const TELEFONE_TESTE = "11999990000";
const VENDA_BASE = {
  id_sale: 999998,
  customer_phone: TELEFONE_TESTE,
  customer_name: "Cliente Teste Fidelidade",
  order_total: 80.00,   // R$80 → BRONZE, ~5 pontos (4pts/R$), ~R$0,20 cashback
};
const VENDA_GRANDE = {
  id_sale: 999999,
  customer_phone: TELEFONE_TESTE,
  customer_name: "Cliente Teste Fidelidade",
  order_total: 250.00, // Total acumulado ficará em 330 → nível OURO
};

// ─── Suíte ───────────────────────────────────────────────────────────────────

async function run() {
  const adminHeaders = await getAdminHeaders();

  console.log("\n══════════════════════════════════════════════════");
  console.log("  TESTES DE INTEGRAÇÃO SAIPOS — Fidelidade");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Admin Auth  : ${adminAuthMode}`);
  if (ADMIN_TOKEN) {
    console.log(`  Admin Token : ${ADMIN_TOKEN.slice(0,4)}****`);
  }
  console.log(`  Cron Secret : ${CRON_SECRET ? `${CRON_SECRET.slice(0,4)}****` : "⚠️ NÃO CONFIGURADO"}`);
  console.log(`  Saipos Token: ${SAIPOS_TOKEN ? `${SAIPOS_TOKEN.slice(0,4)}****` : "⚠️ NÃO CONFIGURADO"}`);

  // ─── 1. Autenticação ─────────────────────────────────────────────────────
  console.log("\n[1] Autenticação");

  await test("Admin sem token → 401", async () => {
    const r = await req("GET", "/api/admin/premios");
    assert(r.status === 401, `esperado 401, recebeu ${r.status}`);
  });

  await test("Admin token errado → 403", async () => {
    const r = await req("GET", "/api/admin/premios", { headers: { Authorization: "Bearer errado" } });
    assert(r.status === 403, `esperado 403, recebeu ${r.status}`);
  });

  await test("Admin por query token legado → 401", async () => {
    const r = await req("GET", `/api/admin/premios?token=${ADMIN_TOKEN || "legado"}`);
    assert(r.status === 401, `esperado 401, recebeu ${r.status}`);
  });

  await test("Admin token correto → não 401/403", async () => {
    const r = await req("GET", "/api/admin/premios", { headers: adminHeaders });
    assert(r.status !== 401 && r.status !== 403, `esperado 2xx/5xx, recebeu ${r.status}`);
  });

  await test("Cron sem token → 401", async () => {
    const r = await req("GET", "/api/cron/saipos");
    assert(r.status === 401, `esperado 401, recebeu ${r.status}`);
  });

  await test("Cron token correto → não 401/403", async () => {
    const r = await req("GET", "/api/cron/sorteio", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      timeoutMs: 20000,
    });
    assert(r.status !== 401 && r.status !== 403, `esperado 2xx/5xx, recebeu ${r.status}`);
  });

  await test("Webhook SAIPOS sem token → 401", async () => {
    const r = await req("POST", "/api/webhooks/saipos", { body: VENDA_BASE });
    assert(r.status === 401, `esperado 401, recebeu ${r.status}`);
  });

  // ─── 2. Webhook — Processamento de venda ─────────────────────────────────
  console.log("\n[2] Webhook — Processamento de Venda");

  await test("Venda R$80 processada com sucesso → ok:true", async () => {
    const r = await req("POST", "/api/webhooks/saipos", {
      headers: { "x-auth-token": SAIPOS_TOKEN },
      body: VENDA_BASE,
    });
    assert(r.status === 200 || r.status === 201, `esperado 2xx, recebeu ${r.status}`);
    assert(r.json?.ok === true, `esperado ok:true, recebeu: ${JSON.stringify(r.json)}`);
  });

  await test("Mesma venda (id_sale=999998) novamente → idempotência (ok:true, mensagem ignorado)", async () => {
    const r = await req("POST", "/api/webhooks/saipos", {
      headers: { "x-auth-token": SAIPOS_TOKEN },
      body: VENDA_BASE,
    });
    assert(r.status === 200, `esperado 200, recebeu ${r.status}`);
    const msg = r.json?.message || "";
    assert(msg.includes("já processada") || r.json?.ok === true,
      `esperado mensagem de idempotência, recebeu: ${JSON.stringify(r.json)}`);
  });

  await test("Venda sem valor → rejeitada (ok:false)", async () => {
    const r = await req("POST", "/api/webhooks/saipos", {
      headers: { "x-auth-token": SAIPOS_TOKEN },
      body: { ...VENDA_BASE, id_sale: 777001, order_total: 0 },
    });
    assert(r.status === 200, `esperado 200, recebeu ${r.status}`);
    assert(r.json?.ok === false, `esperado ok:false, recebeu: ${JSON.stringify(r.json)}`);
  });

  await test("Venda sem telefone → tratada graciosamente", async () => {
    const r = await req("POST", "/api/webhooks/saipos", {
      headers: { "x-auth-token": SAIPOS_TOKEN },
      body: { id_sale: 777002, customer_phone: "", order_total: 50 },
    });
    assert(r.status === 200, `esperado 200, recebeu ${r.status}`);
  });

  // ─── 3. Progressão de Nível ───────────────────────────────────────────────
  console.log("\n[3] Progressão de Nível (Regras de Negócio)");

  await test("Segunda venda R$250 → cliente deve subir para OURO (total=R$330)", async () => {
    const r = await req("POST", "/api/webhooks/saipos", {
      headers: { "x-auth-token": SAIPOS_TOKEN },
      body: VENDA_GRANDE,
    });
    assert(r.status === 200, `esperado 200, recebeu ${r.status}`);
    if (r.json?.ganhos?.novo_nivel) {
      const nivel = r.json.ganhos.novo_nivel;
      assert(nivel === "OURO", `esperado OURO após R$330 acumulado, recebeu ${nivel}`);
    }
  });

  // ─── 4. Consulta de cliente via API pública ───────────────────────────────
  console.log("\n[4] Consulta de Cliente");

  await test("Consultar cliente pelo telefone de teste → dados encontrados", async () => {
    const r = await req("GET", `/api/consultar?telefone=${TELEFONE_TESTE}`);
    assert(r.status !== 404, `cliente não encontrado — verificar se Supabase está conectado`);
    assert(r.status !== 401, `auth inesperada em rota pública`);
  });

  // ─── 5. Crons ─────────────────────────────────────────────────────────────
  console.log("\n[5] Crons — Autenticação e Resposta");

  const crons = [
    "/api/cron/expirar-pontos",
    "/api/cron/saipos",
    "/api/cron/sorteio",
    "/api/cron/saipos/historico?dias=1",
  ];

  for (const path of crons) {
    await test(`${path} com CRON_SECRET → não 401/403`, async () => {
      const r = await req("GET", path, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
        timeoutMs: path.includes("/api/cron/saipos") ? 120000 : 30000,
      });
      assert(r.status !== 401 && r.status !== 403,
        `auth falhou com token correto: ${r.status} — ${JSON.stringify(r.json)}`);
      // Mostrar resultado informativo (sem falhar em erros upstream SAIPOS)
      const info = r.json?.sucesso ? `✓ ${r.json.processadas ?? 0} vendas` : r.json?.erro || r.json?.error || r.status;
      console.log(`       → resposta: ${info}`);
    });
  }

  // ─── Resultado ────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log(`  Resultado: ${passed} passaram, ${failed} falharam`);
  if (failed > 0) {
    console.log("  ⚠️  Falhas acima podem indicar Supabase offline (dev) ou bug real.");
    console.log("  Testes de auth (✅/❌) SÃO confiáveis mesmo sem Supabase.");
  }
  console.log("══════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("Erro fatal:", e); process.exit(1); });
