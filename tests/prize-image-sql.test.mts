import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migração de fotos: storage restrito, vínculo e auditoria atômicos, RPCs da roda preservadas', async t => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001', waiter = '00000000-0000-4000-8000-000000000002';
  const path = 'roleta/1/00000000-0000-4000-8000-000000000003.webp';
  const url = 'https://asjoubgoccbvftyggunz.supabase.co/storage/v1/object/public/premios/' + path;
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema storage;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text, name text, metadata jsonb);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon, authenticated;
      grant all on storage.objects to anon, authenticated;
      create policy permissive_fixture on storage.objects for all to anon, authenticated using (true) with check (true);
      create table public.perfis_operacionais(user_id uuid, nome text, email text, papel text, ativo boolean);
      create table public.seguranca_configuracoes(id integer, modo_contencao boolean);
      create table public.premios_roleta(id bigint primary key, nome text, imagem_url text,
        descricao_vitoria text, emoji text, versao integer, ativo boolean, participa_roleta boolean, pesos_nivel integer[],
        tipo text, canal_uso text, expira_em_dias integer, custo_estimado numeric, dias_semana_validos smallint[],
        constraint premios_roleta_imagem_url_segura check (imagem_url is null or imagem_url like '/%'));
      create table public.administracao_eventos(entidade text, entidade_id text, acao text, actor_user_id uuid, actor_email text, detalhes jsonb);
      create table public.roleta_configuracoes(id integer, v2_publicada boolean, v2_modo_teste boolean, texto_consentimento_versao text);
      create table public.entregas_configuracao(id integer, habilitado boolean, permitir_comercial boolean);
      create table public.roleta_sessoes(id uuid primary key, token_hash text, status text, nivel integer, expira_em timestamptz,
        criado_por uuid, valor_comanda numeric, girada_em timestamptz);
      create table public.comandas_roleta(sessao_id uuid, criado_por uuid);
      create table public.cupons_promocionais(id uuid default gen_random_uuid(), codigo_hash text unique, codigo_final text, cliente_id bigint,
        telefone_hash text, tipo_premio text, canal_uso text, status text, modo_teste boolean, valor_desconto_percentual numeric,
        custo_estimado numeric, dias_semana_validos smallint[], nao_valido_feriado boolean, origem text, referencia_origem uuid,
        expira_em timestamptz, detalhes jsonb);
      create table public.roleta_giros(sessao_id uuid unique, cliente_id bigint, telefone_hash text, consentimento_marketing boolean,
        consentimento_versao text, premio_id bigint, cupom_id uuid, aleatorio numeric);
      create table public.consentimentos_marketing(cliente_id bigint, telefone_hash text, finalidade text, concedido boolean,
        texto_versao text, canal text, origem text, ip_hash text);
      create table public.cupom_eventos(cupom_id uuid, acao text, origem text, detalhes jsonb);
      insert into public.perfis_operacionais values ('${admin}', 'Fixture admin', 'fixture@example.invalid', 'superadmin', true),
        ('${waiter}', 'Fixture waiter', 'waiter@example.invalid', 'garcom', true);
      insert into public.seguranca_configuracoes values (1,false);
      insert into public.premios_roleta values (1,'Prêmio fictício',null,'Teste','x',2,true,true,array[1,1,1,1,1,1],
        'frete_gratis','delivery',1,0,array[1,2,3,4,5]);
      insert into public.roleta_configuracoes values (1,true,true,'fixture');
      insert into public.entregas_configuracao values (1,false,false);
    `);
    // Execute the actual, unchanged eligibility/giro definitions (not mocks).
    const ledger = await readFile(new URL('../supabase/migrations/202609290001_entregas_premios.sql', import.meta.url), 'utf8');
    for (const name of ['listar_premios_elegiveis_v2', 'girar_roleta_v2']) {
      const definition = ledger.match(new RegExp(`create (?:or replace )?function public\\.${name}\\([\\s\\S]*?\\$\\$;`))?.[0];
      assert.ok(definition); await db.exec(definition);
    }
    await db.exec(await readFile(new URL('../supabase/migrations/202610010001_imagens_premios.sql', import.meta.url), 'utf8'));
    await db.query('insert into storage.objects values ($1,$2,$3)', ['premios', path, { mimetype: 'image/webp', size: 1024 }]);
    async function update(actor = admin, image = url, before: string | null = null) {
      return (await db.query<{ result: { ok: boolean } }>('select public.atualizar_imagem_premio(1,$1,$2,$3) as result', [actor, image, before])).rows[0].result;
    }
    await t.test('só superadmin ativo altera; pausa, URL externa e objeto inexistente são recusados', async () => {
      assert.equal((await update(waiter)).ok, false);
      await db.exec(`update public.perfis_operacionais set ativo=false where user_id='${admin}'`);
      assert.equal((await update()).ok, false);
      await db.exec(`update public.perfis_operacionais set ativo=true; update public.seguranca_configuracoes set modo_contencao=true`);
      assert.equal((await update()).ok, false);
      await db.exec('update public.seguranca_configuracoes set modo_contencao=false');
      assert.equal((await update(admin, 'https://evil.example/photo.webp')).ok, false);
      assert.equal((await update(admin, url.replace('000000000003', '000000000004'))).ok, false);
      await db.exec("update storage.objects set metadata='{" + '"mimetype":"image/svg+xml","size":1024' + "}'");
      assert.equal((await update()).ok, false);
      await db.exec("update storage.objects set metadata='{" + '"mimetype":"image/webp","size":524289' + "}'");
      assert.equal((await update()).ok, false);
      await db.exec("update storage.objects set metadata='{" + '"mimetype":"image/webp","size":1024' + "}'");
    });
    await t.test('se auditoria falhar, referência antiga permanece; retry obsoleto não duplica evento', async () => {
      await db.exec("alter table public.administracao_eventos add constraint fixture_fail check (acao <> 'premio_roleta_imagem_atualizada')");
      await assert.rejects(update());
      assert.equal((await db.query<{ imagem_url: null }>('select imagem_url from public.premios_roleta')).rows[0].imagem_url, null);
      await db.exec('alter table public.administracao_eventos drop constraint fixture_fail');
      assert.equal((await update()).ok, true); assert.equal((await update()).ok, false);
      assert.equal((await db.query<{ total: number }>('select count(*)::int as total from public.administracao_eventos')).rows[0].total, 1);
    });
    await t.test('foto aparece na elegibilidade e no giro real sem alterar prêmio/pesos ou permitir re-roll', async () => {
      const id = '00000000-0000-4000-8000-000000000005';
      await db.query("insert into public.roleta_sessoes values ($1,'fixture-token','aberta',1,now()+interval '10 minutes',null,200,null)", [id]);
      const prizes = await db.query<{ imagem_url: string }>('select * from public.listar_premios_elegiveis_v2($1)', [id]);
      assert.equal(prizes.rows[0].imagem_url, url);
      const args = ['fixture-token','fixture-phone',null,false,'fixture','fixture','fixture-ip',0,'fixture-code','fixture-code'];
      const query = 'select public.girar_roleta_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result';
      const result = (await db.query<{ result: { ok: boolean; premio: { imagem_url: string } } }>(query, args)).rows[0].result;
      assert.equal(result.ok, true); assert.equal(result.premio.imagem_url, url);
      assert.equal((await db.query<{ result: { ok: boolean } }>(query, args)).rows[0].result.ok, false);
    });
    await t.test('RLS barra upload direto mesmo com política permissiva; RPC não acessível a clientes', async () => {
      for (const role of ['anon', 'authenticated']) {
        assert.equal((await db.query<{ allowed: boolean }>("select has_function_privilege($1,'public.atualizar_imagem_premio(bigint,uuid,text,text)','EXECUTE') as allowed", [role])).rows[0].allowed, false);
        await db.exec('set role ' + role);
        await assert.rejects(db.query("insert into storage.objects values ('premios','forged.webp','{}')"));
        await db.exec('reset role');
      }
      assert.equal((await db.query<{ allowed: boolean }>("select has_function_privilege('service_role','public.atualizar_imagem_premio(bigint,uuid,text,text)','EXECUTE') as allowed")).rows[0].allowed, true);
      await assert.rejects(db.query("update public.premios_roleta set imagem_url='https://evil.example/image.webp'"));
      await db.query("update public.premios_roleta set imagem_url='/produtos/pudim.png'");
    });
  } finally { await db.close(); }
});
