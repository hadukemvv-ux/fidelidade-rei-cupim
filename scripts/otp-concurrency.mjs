// Explicit local integration test: owns a disposable cluster, never DATABASE_URL.
// OTP_TEST_PG_BIN must point to trusted PostgreSQL binaries. No Supabase/WhatsApp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const run = promisify(execFile);
const bin = process.env.OTP_TEST_PG_BIN;
if (!bin || !isAbsolute(bin)) throw new Error('Set OTP_TEST_PG_BIN to an absolute trusted PostgreSQL bin directory.');
const executable = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const options = { windowsHide: true, timeout: 30_000, maxBuffer: 1_048_576 };
const phone = 'a'.repeat(64), ip = 'b'.repeat(64), codeHash = 'c'.repeat(64), grant = 'd'.repeat(64);
async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

test('OTP concurrency in disposable native PostgreSQL with distinct backend connections', { timeout: 90_000 }, async t => {
  await access(executable('initdb')); await access(executable('pg_ctl'));
  const directory = await mkdtemp(join(tmpdir(), 'cupim-pg-concurrency-'));
  const data = join(directory, 'data');
  let initialized = false, started = false, stopped = false;
  const clients = [];
  try {
    // Trust is ONLY for fake fixtures in this loopback-only disposable cluster.
    // Do not reuse this configuration for production or existing databases.
    await run(executable('initdb'), ['-D', data, '-U', 'fixture', '-A', 'trust', '--encoding=UTF8', '--no-locale'], options);
    initialized = true;
    const port = await freePort();
    await run(executable('pg_ctl'), ['start', '-D', data, '-l', join(directory, 'server.log'), '-w', '-t', '20',
      '-o', `-h 127.0.0.1 -p ${port} -c shared_buffers=16MB -c max_connections=8`], options);
    started = true;
    for (let i = 0; i < 3; i++) {
      const client = new pg.Client({ host: '127.0.0.1', port, user: 'fixture', password: 'fixture-only',
        database: 'postgres', ssl: false, connectionTimeoutMillis: 5000,
        statement_timeout: 10_000, lock_timeout: 5000, application_name: `cupim-otp-fixture-${i}` });
      clients.push(client); await client.connect();
    }
    const [a, b, observer] = clients;
    const pidA = (await a.query('select pg_backend_pid() as pid')).rows[0].pid;
    const pidB = (await b.query('select pg_backend_pid() as pid')).rows[0].pid;
    assert.notEqual(pidA, pidB);
    await observer.query('create role anon; create role authenticated; create role service_role; create table public.base_clientes_saipos(id bigint);');
    for (const name of ['202609030002_whatsapp_otp.sql', '202609300001_whatsapp_otp_qr.sql']) {
      await observer.query(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
    }
    await a.query('set role service_role'); await b.query('set role service_role');
    async function rpc(client, name, args) {
      return (await client.query(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`, args)).rows[0].result;
    }
    const reserve = client => rpc(client, 'reservar_envio_otp', [phone, ip, 'cadastro', 3, 10, 30, 60]);
    const verify = (client, id, candidate = codeHash, candidateGrant = grant) =>
      rpc(client, 'verificar_otp_qr', [id, phone, 'cadastro', candidate, candidateGrant]);
    async function waitBlocked() {
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        const row = (await observer.query('select wait_event_type from pg_stat_activity where pid = $1', [pidB])).rows[0];
        if (row?.wait_event_type === 'Lock') return;
        await delay(20);
      }
      assert.fail('Second PostgreSQL backend did not demonstrate a real lock wait');
    }
    async function prepared() {
      const result = await reserve(a); assert.equal(result.autorizado, true);
      assert.ok(await rpc(a, 'preparar_otp_qr', [result.solicitacao_id, phone, 'cadastro', codeHash]));
      assert.equal(await rpc(a, 'finalizar_envio_otp_qr', [result.solicitacao_id, true]), true);
      return result.solicitacao_id;
    }
    async function scenario(name, operation) {
      await t.test(name, async () => {
        await observer.query('truncate public.otp_verificacoes');
        try { await operation(); } finally { await a.query('rollback'); await b.query('rollback'); }
      });
    }
    await scenario('simultaneous reservations wait on advisory lock and grant one request only', async () => {
      await a.query('begin');
      await a.query("select pg_advisory_xact_lock(hashtextextended('fidelidade_otp_limites', 0))");
      const second = reserve(b); void second.catch(() => {});
      await waitBlocked();
      assert.equal((await reserve(a)).autorizado, true);
      await a.query('commit');
      const result = await second;
      assert.equal(result.autorizado, false); assert.equal(result.motivo, 'intervalo');
      assert.equal((await observer.query('select count(*)::int as total from public.otp_verificacoes')).rows[0].total, 1);
    });
    await scenario('simultaneous correct verifications emit exactly one grant', async () => {
      const id = await prepared();
      await a.query('begin');
      assert.equal((await verify(a, id)).status, 'verificado');
      const second = verify(b, id, codeHash, 'e'.repeat(64)); void second.catch(() => {});
      await waitBlocked(); await a.query('commit');
      assert.equal((await second).status, 'indisponivel');
      const row = (await observer.query('select tentativas, grant_hash, codigo_hash from public.otp_verificacoes')).rows[0];
      assert.deepEqual(row, { tentativas: 1, grant_hash: grant, codigo_hash: null });
    });
    await scenario('simultaneous consumption cannot use the same signup/reset grant twice', async () => {
      const id = await prepared(); await verify(a, id);
      await a.query('begin');
      assert.equal(await rpc(a, 'consumir_grant_otp', [grant, phone, 'cadastro']), true);
      const second = rpc(b, 'consumir_grant_otp', [grant, phone, 'cadastro']); void second.catch(() => {});
      await waitBlocked(); await a.query('commit');
      assert.equal(await second, false);
      const row = (await observer.query('select status, grant_hash from public.otp_verificacoes')).rows[0];
      assert.deepEqual(row, { status: 'consumido', grant_hash: null });
    });
    await scenario('parallel wrong guesses stop at five, with no grant', async () => {
      const id = await prepared();
      // Two concurrent connections, but no overlapping query on a single client.
      const batches = await Promise.all([a, b].map(async client => {
        const values = [];
        for (let i = 0; i < 5; i++) values.push(await verify(client, id, 'f'.repeat(64)));
        return values;
      }));
      const results = batches.flat();
      assert.equal(results.filter(r => r.status === 'invalido').length, 5);
      assert.equal(results.filter(r => r.status === 'indisponivel').length, 5);
      const row = (await observer.query('select tentativas, grant_hash from public.otp_verificacoes')).rows[0];
      assert.deepEqual(row, { tentativas: 5, grant_hash: null });
    });
    await scenario('new reservation racing old preparation cannot revive the old code', async () => {
      const first = await reserve(a);
      await observer.query("update public.otp_verificacoes set criado_em = now() - interval '61 seconds'");
      await a.query('begin');
      const newer = await reserve(a); assert.equal(newer.autorizado, true);
      const second = rpc(b, 'preparar_otp_qr', [first.solicitacao_id, phone, 'cadastro', codeHash]); void second.catch(() => {});
      await waitBlocked(); await a.query('commit');
      assert.equal(await second, null);
      assert.ok(await rpc(a, 'preparar_otp_qr', [newer.solicitacao_id, phone, 'cadastro', codeHash]));
    });
  } finally {
    await Promise.allSettled(clients.map(client => client.end()));
    if (initialized) {
      try {
        await run(executable('pg_ctl'), ['stop', '-D', data, '-w', '-t', '15', '-m', 'fast'], options);
        stopped = true;
      } catch {
        // A failed start may never have created a server; verify before removal.
        try { await access(join(data, 'postmaster.pid')); }
        catch (error) { if (error.code === 'ENOENT') stopped = true; }
      }
    }
    if (started && !stopped) throw new Error('Fixture PostgreSQL may still be running; preserve its temporary directory for recovery.');
    // Only remove the exact mkdtemp directory owned by this test, never a workspace.
    const target = resolve(directory);
    if ((!initialized || stopped) && dirname(target) === resolve(tmpdir()) && basename(target).startsWith('cupim-pg-concurrency-')) {
      await rm(target, { recursive: true, force: true });
    }
  }
});
