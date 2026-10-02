import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { hashQrOtpCode } from '../src/lib/qrOtpCore.ts';
import { randomBytes } from 'node:crypto';

// Real PostgreSQL engine in memory; no Supabase credentials or customer data.
// PGlite serializes calls: this suite is NOT a two-connection concurrency test.
test('migrações OTP QR em PostgreSQL isolado', async t => {
  const db = new PGlite();
  const phoneHash = 'a'.repeat(64), ipHash = 'b'.repeat(64), grantHash = 'c'.repeat(64);
  const codeKey = randomBytes(32);
  const code = '000123';
  try {
    await db.exec('create role anon; create role authenticated; create role service_role; create table public.base_clientes_saipos(id bigint);');
    await db.exec(await readFile(new URL('../supabase/migrations/202609030002_whatsapp_otp.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/202609300001_whatsapp_otp_qr.sql', import.meta.url), 'utf8'));
    async function rpc(name: string, args: unknown[]) {
      const result = await db.query<{ result: unknown }>(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`, args);
      return result.rows[0].result;
    }
    async function reserve(phone = phoneHash, ip = ipHash, purpose = 'cadastro', maxPhone = 3, maxIp = 10, maxDay = 30) {
      return await rpc('reservar_envio_otp', [phone, ip, purpose, maxPhone, maxIp, maxDay, 60]) as { autorizado: boolean; solicitacao_id: string; motivo?: string };
    }
    async function prepare(purpose = 'cadastro') {
      const r = await reserve(phoneHash, ipHash, purpose);
      assert.equal(r.autorizado, true);
      const hash = hashQrOtpCode(code, r.solicitacao_id, codeKey);
      assert.ok(await rpc('preparar_otp_qr', [r.solicitacao_id, phoneHash, purpose, hash]));
      return { id: r.solicitacao_id, hash, purpose };
    }
    async function verify(r: { id: string; hash: string; purpose: string }, hash = r.hash, phone = phoneHash, purpose = r.purpose, grant = grantHash) {
      return await rpc('verificar_otp_qr', [r.id, phone, purpose, hash, grant]) as { status: string };
    }
    async function scenario(name: string, run: () => Promise<void>) {
      await t.test(name, async () => { await db.exec('truncate public.otp_verificacoes'); await run(); });
    }
    await scenario('confirmação emite grant uma vez; consumo exige telefone e propósito e não repete', async () => {
      const r = await prepare();
      assert.equal(await rpc('finalizar_envio_otp_qr', [r.id, true]), true);
      assert.equal((await verify(r)).status, 'verificado');
      assert.equal((await verify(r)).status, 'indisponivel');
      assert.equal(await rpc('consumir_grant_otp', [grantHash, 'd'.repeat(64), r.purpose]), false);
      assert.equal(await rpc('consumir_grant_otp', [grantHash, phoneHash, 'redefinir_pin']), false);
      assert.equal(await rpc('consumir_grant_otp', [grantHash, phoneHash, r.purpose]), true);
      assert.equal(await rpc('consumir_grant_otp', [grantHash, phoneHash, r.purpose]), false);
      const row = (await db.query<{ codigo_hash: null; grant_hash: null }>('select codigo_hash, grant_hash from public.otp_verificacoes')).rows[0];
      assert.deepEqual(row, { codigo_hash: null, grant_hash: null });
    });
    await scenario('reservado não confirma; envio incerto permite prova do código, não prova entrega', async () => {
      const r = await prepare();
      assert.equal((await verify(r)).status, 'indisponivel');
      assert.equal(await rpc('finalizar_envio_otp_qr', [r.id, false]), true);
      assert.equal((await verify(r)).status, 'verificado');
      assert.equal(await rpc('finalizar_envio_otp_qr', [r.id, true]), false);
    });
    await scenario('telefone/propósito errados não tomam a reserva nem o código', async () => {
      const r = await prepare(); await rpc('finalizar_envio_otp_qr', [r.id, true]);
      assert.equal((await verify(r, r.hash, 'd'.repeat(64))).status, 'indisponivel');
      assert.equal((await verify(r, r.hash, phoneHash, 'redefinir_pin')).status, 'indisponivel');
      assert.equal((await verify(r)).status, 'verificado');
    });
    await scenario('cinco palpites esgotam o código; grant não é emitido', async () => {
      const r = await prepare(); await rpc('finalizar_envio_otp_qr', [r.id, true]);
      for (let i = 0; i < 5; i++) assert.equal((await verify(r, 'd'.repeat(64))).status, 'invalido');
      assert.equal((await verify(r)).status, 'indisponivel');
      const row = (await db.query<{ tentativas: number; grant_hash: null }>('select tentativas, grant_hash from public.otp_verificacoes')).rows[0];
      assert.deepEqual(row, { tentativas: 5, grant_hash: null });
    });
    await scenario('código e grant expirados não confirmam/consomem', async () => {
      const r = await prepare(); await rpc('finalizar_envio_otp_qr', [r.id, true]);
      await db.exec("update public.otp_verificacoes set expira_em = now() - interval '1 second'");
      assert.equal((await verify(r)).status, 'indisponivel');
      await db.exec("update public.otp_verificacoes set expira_em = now() + interval '10 minutes'");
      assert.equal((await verify(r)).status, 'verificado');
      await db.exec("update public.otp_verificacoes set expira_em = now() - interval '1 second'");
      assert.equal(await rpc('consumir_grant_otp', [grantHash, phoneHash, r.purpose]), false);
    });
    await scenario('falha não devolve quota; intervalo e teto por telefone permanecem', async () => {
      let r = await reserve(); assert.equal(r.autorizado, true);
      await db.exec("update public.otp_verificacoes set status = 'falhou'");
      assert.equal((await reserve()).motivo, 'intervalo');
      await db.exec("update public.otp_verificacoes set criado_em = now() - interval '61 seconds'");
      for (let i = 0; i < 2; i++) {
        r = await reserve(); assert.equal(r.autorizado, true);
        await db.exec("update public.otp_verificacoes set criado_em = now() - interval '61 seconds', status = 'falhou'");
      }
      assert.equal((await reserve()).motivo, 'telefone_hora');
    });
    await scenario('limites de IP e 24h também contam todas as reservas', async () => {
      assert.equal((await reserve(phoneHash, ipHash, 'cadastro', 3, 1, 2)).autorizado, true);
      assert.equal((await reserve('d'.repeat(64), ipHash, 'cadastro', 3, 1, 2)).motivo, 'ip_hora');
      assert.equal((await reserve('e'.repeat(64), 'f'.repeat(64), 'cadastro', 3, 1, 1)).motivo, 'global_dia');
    });
    await scenario('resend explícito invalida código anterior; mesmo código não atravessa UUIDs', async () => {
      const first = await prepare(); await rpc('finalizar_envio_otp_qr', [first.id, true]);
      await db.exec("update public.otp_verificacoes set criado_em = now() - interval '61 seconds'");
      const second = await prepare(); await rpc('finalizar_envio_otp_qr', [second.id, true]);
      assert.notEqual(first.hash, second.hash);
      assert.equal((await verify(first)).status, 'indisponivel');
      assert.equal((await verify(second, first.hash)).status, 'invalido');
      assert.equal((await verify(second)).status, 'verificado');
    });
    await scenario('preparação só uma vez; mais nova reserva impede reviver a antiga', async () => {
      const first = await reserve();
      await db.exec("update public.otp_verificacoes set criado_em = now() - interval '61 seconds'");
      const second = await reserve();
      assert.equal(await rpc('preparar_otp_qr', [first.solicitacao_id, phoneHash, 'cadastro', 'd'.repeat(64)]), null);
      assert.ok(await rpc('preparar_otp_qr', [second.solicitacao_id, phoneHash, 'cadastro', 'e'.repeat(64)]));
      assert.equal(await rpc('preparar_otp_qr', [second.solicitacao_id, phoneHash, 'cadastro', 'f'.repeat(64)]), null);
    });
    await scenario('Twilio não pode confirmar QR e RPC de QR não pode confirmar Twilio', async () => {
      const r = await prepare(); await rpc('finalizar_envio_otp_qr', [r.id, true]);
      assert.equal(await rpc('registrar_tentativa_otp', [r.id, phoneHash, r.purpose, 5]), false);
      await db.exec("update public.otp_verificacoes set provedor = 'twilio'");
      assert.equal((await verify(r)).status, 'indisponivel');
      assert.equal(await rpc('registrar_tentativa_otp', [r.id, phoneHash, r.purpose, 5]), true);
    });
    await scenario('RPCs recusam parâmetros malformados e limites que desativam proteção', async () => {
      await assert.rejects(rpc('reservar_envio_otp', ['raw phone', ipHash, 'cadastro', 3, 10, 30, 60]));
      await assert.rejects(rpc('reservar_envio_otp', [phoneHash, ipHash, 'cadastro', 3, 10, 30, 0]));
      await assert.rejects(rpc('reservar_envio_otp', [phoneHash, ipHash, null, 3, 10, 30, 60]));
    });
    await scenario('RLS/EXECUTE bloqueiam anon/authenticated; serviço chama funções com search_path vazio', async () => {
      const functions = ['preparar_otp_qr(uuid,text,text,text)', 'finalizar_envio_otp_qr(uuid,boolean)',
        'verificar_otp_qr(uuid,text,text,text,text)', 'reservar_envio_otp(text,text,text,integer,integer,integer,integer)'];
      for (const fn of functions) {
        for (const role of ['anon', 'authenticated']) {
          const row = (await db.query<{ allowed: boolean }>("select has_function_privilege($1, $2, 'EXECUTE') as allowed", [role, 'public.' + fn])).rows[0];
          assert.equal(row.allowed, false);
        }
        assert.equal((await db.query<{ allowed: boolean }>("select has_function_privilege('service_role', $1, 'EXECUTE') as allowed", ['public.' + fn])).rows[0].allowed, true);
      }
      await db.exec('set role anon');
      await assert.rejects(db.query('select * from public.otp_verificacoes'));
      await db.exec('reset role; set role service_role');
      assert.equal((await reserve()).autorizado, true); // SECURITY DEFINER really executes.
      await db.exec('reset role');
    });
  } finally { await db.close(); }
});
