import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { hashPin } from '../src/lib/pin.ts';
import { BONUS_CADASTRO_PONTOS } from '../src/lib/fidelidade-rules.ts';
import { signupResultResponse } from '../src/lib/customerSignupResult.ts';

// No real customer rows or network. PGlite serializes queries; real concurrency
// is covered separately by scripts/signup-concurrency.mjs.
test('cadastro transacional com subset do schema real', async t => {
  const db = new PGlite();
  const phone = '85988887777', phoneHash = 'a'.repeat(64), grant = 'b'.repeat(64);
  const pinHash = await hashPin('4321');
  try {
    await db.exec(await readFile(new URL('./fixtures/customer-signup.sql', import.meta.url),'utf8'));
    for (const name of ['202609030002_whatsapp_otp.sql','202609040001_consentimento_aniversario.sql',
      '202609300001_whatsapp_otp_qr.sql','202610020002_cadastro_atomico.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
    }
    async function proof(hash = grant, purpose = 'cadastro', who = phoneHash) {
      await db.query(`insert into public.otp_verificacoes(telefone_hash,ip_hash,proposito,status,grant_hash)
        values($1,$2,$3,'verificado',$4)`,[who,'c'.repeat(64),purpose,hash]);
    }
    async function signup(overrides: Record<string, unknown> = {}) {
      const args = { grant, phoneHash, phone, name:'Pessoa de fixture', email:null, birth:null, consent:false, pin:pinHash,
        bonus:BONUS_CADASTRO_PONTOS, ...overrides };
      return (await db.query<{ result: { ok:boolean; motivo?:string; criado?:boolean; bonus?:number } }>(
        'select public.concluir_cadastro_otp($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',Object.values(args))).rows[0].result;
    }
    async function scenario(name: string, run: () => Promise<void>) {
      await t.test(name, async () => {
        await db.exec('truncate public.extrato_pontos,public.base_clientes_saipos,public.otp_verificacoes; update public.seguranca_configuracoes set modo_contencao=false');
        await run();
      });
    }
    await scenario('homônimos permitidos; telefone/email únicos, CPF sem unicidade artificial; RPC exclusiva do serviço',async () => {
      for(const role of ['anon','authenticated','service_role']) {
        const allowed = (await db.query<{ allowed:boolean }>(`select has_function_privilege($1,
          'public.concluir_cadastro_otp(text,text,text,text,text,date,boolean,text,integer)','execute') as allowed`,[role])).rows[0].allowed;
        assert.equal(allowed,role==='service_role');
      }
      await proof(); assert.deepEqual(await signup(),{ok:true,criado:true,bonus:BONUS_CADASTRO_PONTOS});
      await proof('d'.repeat(64)); assert.equal((await signup({grant:'d'.repeat(64),phone:'85988887778'})).ok,true);
      await assert.rejects(db.query("insert into public.base_clientes_saipos(nome,telefone) values('Outra pessoa',$1)",[phone]),{code:'23505'});
      await db.exec("update public.base_clientes_saipos set email='fixture@example.invalid',cpf='00000000000' where telefone='85988887777'");
      await assert.rejects(db.exec("insert into public.base_clientes_saipos(nome,telefone,email) values('Outra','85988887779','fixture@example.invalid')"),{code:'23505'});
      // Production has no CPF uniqueness. Preserve its actual behavior, do not
      // accidentally claim/add a constraint that was never present.
      await db.exec("insert into public.base_clientes_saipos(nome,telefone,cpf) values('Outra','85988887779','00000000000')");
      const entry = (await db.query<{ cliente_id:string; valor:number }>('select cliente_id,valor from public.extrato_pontos order by id limit 1')).rows[0];
      const customer = (await db.query<{ id:number }>('select id from public.base_clientes_saipos where telefone=$1',[phone])).rows[0];
      assert.equal(entry.cliente_id,String(customer.id)); assert.equal(entry.valor,BONUS_CADASTRO_PONTOS);
    });
    await scenario('grant vinculado ao telefone/propósito/prazo/status, sem consumo na recusa',async () => {
      await proof();
      assert.equal((await signup({phoneHash:'f'.repeat(64)})).motivo,'otp_required');
      await db.exec("update public.otp_verificacoes set proposito='redefinir_pin'");
      assert.equal((await signup()).motivo,'otp_required');
      await db.exec("update public.otp_verificacoes set proposito='cadastro',expira_em=now()-interval '1 second'");
      assert.equal((await signup()).motivo,'otp_required');
      await db.exec("update public.otp_verificacoes set expira_em=now()+interval '10 minutes',status='enviado'");
      assert.equal((await signup()).motivo,'otp_required');
      assert.equal((await db.query<{ n:number }>('select count(*)::int n from public.base_clientes_saipos')).rows[0].n,0);
    });
    await scenario('falha no extrato desfaz cliente, pontos e consumo; mesmo grant pode ser usado após reparo',async () => {
      await proof();
      await db.exec("create function public.fixture_fail() returns trigger language plpgsql as $$ begin raise exception 'fixture failure'; end $$; create trigger fixture_fail before insert on public.extrato_pontos for each row execute function public.fixture_fail()");
      try { await assert.rejects(signup(),/fixture failure/); } finally { await db.exec('drop trigger fixture_fail on public.extrato_pontos; drop function public.fixture_fail()'); }
      const state = (await db.query<{ status:string; grant_hash:string }>('select status,grant_hash from public.otp_verificacoes')).rows[0];
      assert.equal(state.status,'verificado'); assert.equal(state.grant_hash,grant);
      assert.equal((await db.query<{ n:number }>('select count(*)::int n from public.base_clientes_saipos')).rows[0].n,0);
      assert.equal((await signup()).ok,true);
      assert.equal((await signup()).motivo,'otp_required');
      assert.equal((await db.query<{ n:number }>('select count(*)::int n from public.extrato_pontos')).rows[0].n,1);
    });
    await scenario('pré-cadastro preserva saldos e perfil, recebe um bônus e não pode ser reassumido',async () => {
      await db.query(`insert into public.base_clientes_saipos(nome,telefone,pontos,cashback,tickets,total_gasto,nivel)
        values('Nome importado',$1,31,12,7,90,'OURO')`,[phone]);
      await proof(); assert.equal((await signup()).criado,false);
      const row = (await db.query<Record<string,unknown>>('select * from public.base_clientes_saipos')).rows[0];
      assert.equal(row.nome,'Nome importado'); assert.equal(row.pontos,31+BONUS_CADASTRO_PONTOS);
      assert.equal(Number(row.cashback),12); assert.equal(row.tickets,7); assert.equal(Number(row.total_gasto),90);
      assert.equal(row.nivel,'OURO'); assert.equal(row.pin_hash,pinHash); assert.ok(row.telefone_verificado_em);
      await proof('d'.repeat(64)); assert.equal((await signup({grant:'d'.repeat(64),name:'Tentar alterar'})).motivo,'existing_account');
      assert.equal((await db.query<{ n:number }>('select count(*)::int n from public.extrato_pontos')).rows[0].n,1);
    });
    await scenario('PIN automático legado substituído; placeholder da roleta vira nome completo',async () => {
      const legacy = createHash('sha256').update(phone.slice(0,4)).digest('hex');
      await db.query("insert into public.base_clientes_saipos(nome,telefone,pin_hash) values('Cliente Novo (Roleta)',$1,$2)",[phone,legacy]);
      await proof(); assert.equal((await signup()).ok,true);
      const row = (await db.query<{ nome:string; pin_hash:string }>('select nome,pin_hash from public.base_clientes_saipos')).rows[0];
      assert.equal(row.nome,'Pessoa de fixture'); assert.equal(row.pin_hash,pinHash);
    });
    await scenario('contenção/entrada inválida/email ocupado preservam confirmação',async () => {
      await proof(); await db.exec('update public.seguranca_configuracoes set modo_contencao=true');
      assert.equal((await signup()).motivo,'paused'); await db.exec('update public.seguranca_configuracoes set modo_contencao=false');
      assert.equal((await signup({name:'Cliente Novo (Roleta)'})).motivo,'invalid');
      assert.equal((await signup({pin:'raw PIN'})).motivo,'invalid');
      assert.equal((await signup({bonus:-1})).motivo,'invalid');
      await db.exec("insert into public.base_clientes_saipos(nome,telefone,email) values('Pessoa ocupada','85988887779','fixture@example.invalid')");
      assert.equal((await signup({email:'fixture@example.invalid'})).motivo,'email_conflict');
      assert.equal((await db.query<{ status:string }>('select status from public.otp_verificacoes')).rows[0].status,'verificado');
    });
    await scenario('consentimento opcional não marcado automaticamente; aniversário sem data não gera opt-in',async () => {
      await proof(); assert.equal((await signup({consent:true})).ok,true);
      assert.equal((await db.query<{ aceita_whatsapp_aniversario:boolean }>('select aceita_whatsapp_aniversario from public.base_clientes_saipos')).rows[0].aceita_whatsapp_aniversario,false);
    });
  } finally { await db.close(); }
});

test('retorno do cadastro falha fechado e nunca expõe dados do SQL',() => {
  for(const input of [null,{}, {ok:true}, {ok:true,criado:true,bonus:-1}, {motivo:'conflict',detail:'PII fixture'}, {motivo:'unknown',message:'PII fixture'}]) {
    const output = signupResultResponse(input);
    assert.equal(output.ok,false); assert.equal(JSON.stringify(output).includes('PII fixture'),false);
  }
  assert.deepEqual(signupResultResponse({ok:true,criado:false,bonus:200}),{ok:true,criado:false,bonus:200});
});
