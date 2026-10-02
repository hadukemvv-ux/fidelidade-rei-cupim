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

import { hashPin } from '../src/lib/pin.ts';
import { BONUS_CADASTRO_PONTOS } from '../src/lib/fidelidade-rules.ts';

const run = promisify(execFile);
const bin = process.env.OTP_TEST_PG_BIN;
if (!bin || !isAbsolute(bin)) throw new Error('Set OTP_TEST_PG_BIN to an absolute trusted PostgreSQL bin directory.');
const executable = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const options = { windowsHide: true, timeout: 30_000, maxBuffer: 1_048_576 };
const phoneHash = 'a'.repeat(64), grant = 'd'.repeat(64), phone = '85988887777';
async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

test('signup concurrency in disposable native PostgreSQL with distinct backend connections', { timeout: 90_000 }, async t => {
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

    await observer.query(await readFile(new URL('../tests/fixtures/customer-signup.sql',import.meta.url),'utf8'));
    for (const name of ['202609030002_whatsapp_otp.sql','202609040001_consentimento_aniversario.sql',
      '202609300001_whatsapp_otp_qr.sql','202610020002_cadastro_atomico.sql']) {
      await observer.query(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
    }
    await a.query('set role service_role'); await b.query('set role service_role');
    const pinHash = await hashPin('4321');
    async function signup(client, overrides = {}) {
      const args = { grant,phoneHash,phone,name:'Pessoa de fixture',email:null,birth:null,consent:false,
        pin:pinHash,bonus:BONUS_CADASTRO_PONTOS,...overrides };
      return (await client.query('select public.concluir_cadastro_otp($1,$2,$3,$4,$5,$6,$7,$8,$9) result',
        Object.values(args))).rows[0].result;
    }
    async function proof(hash = grant) {
      await observer.query("insert into public.otp_verificacoes(telefone_hash,ip_hash,proposito,status,grant_hash) values($1,$1,'cadastro','verificado',$2)",[phoneHash,hash]);
    }
    async function waitBlocked() {
      const end = Date.now()+3000;
      while(Date.now()<end) {
        const row=(await observer.query('select wait_event_type from pg_stat_activity where pid=$1',[pidB])).rows[0];
        if(row?.wait_event_type==='Lock') return;
        await delay(20);
      }
      assert.fail('Second connection never demonstrated a lock wait');
    }
    async function scenario(name, operation) {
      await t.test(name,async () => {
        await observer.query('truncate public.extrato_pontos,public.base_clientes_saipos,public.otp_verificacoes');
        try { await operation(); } finally { await a.query('rollback'); await b.query('rollback'); }
      });
    }
    await scenario('same grant on two simultaneous requests creates one account and one bonus',async () => {
      await proof(); await a.query('begin'); assert.equal((await signup(a)).ok,true);
      const second=signup(b); void second.catch(()=>{});
      await waitBlocked(); await a.query('commit');
      assert.equal((await second).motivo,'otp_required');
      const row=(await observer.query('select count(*)::int n, sum(pontos)::int points from public.base_clientes_saipos')).rows[0];
      assert.deepEqual(row,{n:1,points:BONUS_CADASTRO_PONTOS});
      assert.equal((await observer.query('select count(*)::int n from public.extrato_pontos')).rows[0].n,1);
    });
    await scenario('different valid grants on same pre-signup preserve first PIN and credit once',async () => {
      await observer.query("insert into public.base_clientes_saipos(nome,telefone,pontos) values('Nome importado',$1,31)",[phone]);
      await proof(); const other='e'.repeat(64); await proof(other);
      await a.query('begin'); assert.equal((await signup(a)).criado,false);
      const second=signup(b,{grant:other,pin:await hashPin('9876')}); void second.catch(()=>{});
      await waitBlocked(); await a.query('commit'); assert.equal((await second).motivo,'existing_account');
      const row=(await observer.query('select pontos,pin_hash,nome from public.base_clientes_saipos')).rows[0];
      assert.deepEqual(row,{pontos:31+BONUS_CADASTRO_PONTOS,pin_hash:pinHash,nome:'Nome importado'});
      assert.equal((await observer.query('select count(*)::int n from public.extrato_pontos')).rows[0].n,1);
      assert.equal((await observer.query('select status from public.otp_verificacoes where grant_hash=$1',[other])).rows[0].status,'verificado');
    });
    await scenario('rollback of first signup allows waiting request to use the same grant',async () => {
      await proof(); await a.query('begin'); assert.equal((await signup(a)).ok,true);
      const second=signup(b); void second.catch(()=>{});
      await waitBlocked(); await a.query('rollback'); assert.equal((await second).ok,true);
      assert.equal((await observer.query('select count(*)::int n from public.extrato_pontos')).rows[0].n,1);
    });
    await scenario('email race rolls back whole losing signup and keeps its confirmation reusable',async () => {
      await proof(); const other='e'.repeat(64); await proof(other);
      await a.query('begin'); assert.equal((await signup(a,{email:'fixture@example.invalid'})).ok,true);
      const args={grant:other,phone:'85988887778',email:'fixture@example.invalid'};
      const second=signup(b,args); void second.catch(()=>{});
      await waitBlocked(); await a.query('commit'); assert.equal((await second).motivo,'conflict');
      assert.equal((await observer.query('select status from public.otp_verificacoes where grant_hash=$1',[other])).rows[0].status,'verificado');
      assert.equal((await signup(b,{...args,email:'other@example.invalid'})).ok,true);
      assert.equal((await observer.query('select count(*)::int n from public.extrato_pontos')).rows[0].n,2);
    });
    await scenario('containment activated before signup lock is observed after actual wait',async () => {
      await proof(); await observer.query('begin');
      await observer.query('update public.seguranca_configuracoes set modo_contencao=true where id=1');
      const second=signup(b); void second.catch(()=>{});
      try { await waitBlocked(); await observer.query('commit'); assert.equal((await second).motivo,'paused'); }
      finally { await observer.query('rollback'); await observer.query('update public.seguranca_configuracoes set modo_contencao=false'); }
      assert.equal((await observer.query('select status from public.otp_verificacoes')).rows[0].status,'verificado');
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
