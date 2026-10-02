import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('edição de prêmios: RPC real com permissões, validação, piloto e auditoria atômica', async t => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001', waiter = '00000000-0000-4000-8000-000000000002';
  try {
    const base = await readFile(new URL('../supabase/migrations/202609010000_schema_base.sql', import.meta.url), 'utf8');
    const definition = base.match(/create table if not exists public\.premios_roleta[^;]+;/)?.[0]; assert.ok(definition);
    await db.exec(`create role anon; create role authenticated; create role service_role;
      ${definition}
      alter table public.premios_roleta add column codigo text, add column versao smallint default 2,
        add column participa_roleta boolean default true, add column canal_uso text default 'ambos',
        add column custo_estimado numeric(12,2) default 0, add column expira_em_dias integer default 14,
        add column pesos_nivel integer[] default array[1,2,3,4,5,6], add column descricao_operacional text,
        add column imagem_url text;
      create table public.perfis_operacionais(user_id uuid primary key, email text, papel text, ativo boolean);
      create table public.seguranca_configuracoes(id integer, modo_contencao boolean);
      create table public.roleta_configuracoes(id integer, v2_modo_teste boolean);
      create table public.administracao_eventos(entidade text, entidade_id text, acao text, actor_user_id uuid, actor_email text, detalhes jsonb);
      insert into public.perfis_operacionais values ('${admin}','fixture@example.invalid','superadmin',true),
        ('${waiter}','waiter@example.invalid','garcom',true);
      insert into public.seguranca_configuracoes values (1,false);
      insert into public.roleta_configuracoes values (1,true);
      insert into public.premios_roleta(id,codigo,nome,descricao_vitoria,tipo,ativo,imagem_url)
        values (1,'saideira_v2','Saideira','Você ganhou uma cerveja.','saideira',false,'/roleta/premios/saideira.webp'),
          (2,'piloto_interno_sem_valor_v2','Teste','Teste','produto',true,null),
          (3,'fixture_special','PlayStation especial','Visual','produto',false,null);
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202610010002_edicao_premios_auditada.sql', import.meta.url), 'utf8'));
    const update = async (changes: unknown, actor = admin, id = 1) => (await db.query<{ result: { ok: boolean; code?: string; premio: Record<string, unknown> } }>(
      'select public.atualizar_premio_roleta($1,$2,$3::jsonb) as result', [id, actor, JSON.stringify(changes)])).rows[0].result;
    const prize = async () => (await db.query<{ premio: Record<string, unknown> }>('select to_jsonb(p) as premio from public.premios_roleta p where id=1')).rows[0].premio;
    await t.test('RPC não executável por anon/authenticated; banco reconfirma superadmin ativo e contenção', async () => {
      for (const role of ['anon','authenticated','service_role']) {
        assert.equal((await db.query<{ allowed: boolean }>("select has_function_privilege($1,'public.atualizar_premio_roleta(bigint,uuid,jsonb)','EXECUTE') as allowed", [role])).rows[0].allowed, role === 'service_role');
      }
      assert.equal((await update({ nome: 'x' }, waiter)).code, 'forbidden');
      await db.query('update public.perfis_operacionais set ativo=false where user_id=$1', [admin]);
      assert.equal((await update({ nome: 'x' })).code, 'forbidden');
      await db.exec('update public.perfis_operacionais set ativo=true; update public.seguranca_configuracoes set modo_contencao=true');
      assert.equal((await update({ nome: 'x' })).code, 'paused');
      await db.exec('update public.seguranca_configuracoes set modo_contencao=false');
    });
    await t.test('SQL independente rejeita tipos/campos adulterados, limites e nome vazio', async () => {
      for (const changes of [[], null, {}, { nome: ' ' }, { nome: null }, { nome: true }, { nome: 'x'.repeat(256) },
        { descricao_vitoria: 'x'.repeat(501) }, { nome: 'linha\nsegunda' }, { descricao_vitoria: 'x\u0001y' },
        { descricao_vitoria: 1 }, { imagem_url: 'https://evil.example' }, { tipo: 'expulsadeira' }, { codigo: 'forged' },
        { pesos_nivel: [1,2,3,4,5,100001] }, { pesos_nivel: [1,2,3,4,5,'x'] }, { pesos_nivel: [1] },
        { ativo: null }, { custo_estimado: '1' }, { custo_estimado: -1 }, { probabilidade: 1.5 }, { expira_em_dias: 91 }]) {
        assert.equal((await update(changes)).code, 'invalid', JSON.stringify(changes));
      }
      assert.equal((await prize()).nome, 'Saideira');
      assert.equal((await update({ nome: 'x' }, admin, 999)).code, 'not_found');
    });
    await t.test('texto novo preserva identidade, quantidade/tipo, foto, pesos, ativação e custo; audit traz antes/depois', async () => {
      const before = await prize();
      const result = await update({ nome: '  Cerveja por nossa conta 🍺 ', descricao_vitoria: '  Você ganhou!\nEscolha a sua.  ' });
      assert.equal(result.ok, true); assert.equal(result.premio.nome, 'Cerveja por nossa conta 🍺');
      for (const key of ['codigo','tipo','imagem_url','pesos_nivel','ativo','participa_roleta','custo_estimado','valor','expira_em_dias']) {
        assert.deepEqual(result.premio[key], before[key], key);
      }
      const audit = (await db.query<{ detalhes: { antes: Record<string, unknown>; depois: Record<string, unknown>; campos_alterados: string[] }; actor_user_id: string; actor_email: string }>(
        'select * from public.administracao_eventos')).rows[0];
      assert.equal(audit.actor_user_id, admin); assert.equal(audit.actor_email, 'fixture@example.invalid');
      assert.equal(audit.detalhes.antes.nome, 'Saideira'); assert.equal(audit.detalhes.antes.descricao_vitoria, 'Você ganhou uma cerveja.');
      assert.equal(audit.detalhes.depois.descricao_vitoria, 'Você ganhou!\nEscolha a sua.');
      assert.deepEqual(audit.detalhes.campos_alterados, ['descricao_vitoria','nome']);
      assert.equal((await update({ nome: result.premio.nome, descricao_vitoria: result.premio.descricao_vitoria })).ok, true);
      assert.equal((await db.query<{ total: number }>('select count(*)::int as total from public.administracao_eventos')).rows[0].total, 1);
    });
    await t.test('auditoria falha: edição inteira faz rollback, inclusive custos enviados no mesmo PUT', async () => {
      const before = await prize();
      await db.exec("alter table public.administracao_eventos add constraint fixture_fail check (acao <> 'premio_roleta_atualizado') not valid");
      await assert.rejects(update({ nome: 'NÃO SALVAR', descricao_vitoria: 'NÃO SALVAR', custo_estimado: 20 }));
      assert.deepEqual(await prize(), before);
      await db.exec('alter table public.administracao_eventos drop constraint fixture_fail');
    });
    await t.test('nome não contorna piloto nem proteção PlayStation; mensagem pode ser limpa', async () => {
      assert.equal((await update({ nome: 'Teste falso', ativo: true })).code, 'pilot');
      assert.equal((await update({ ativo: true }, admin, 2)).ok, true);
      const special = await update({ nome: 'Nome novo', participa_roleta: true }, admin, 3);
      assert.equal(special.ok, true); assert.equal(special.premio.participa_roleta, false);
      assert.equal((await update({ descricao_vitoria: null })).premio.descricao_vitoria, null);
      assert.equal((await update({ descricao_vitoria: '  ' })).premio.descricao_vitoria, null);
      assert.equal((await update({ nome: 'x'.repeat(255), descricao_vitoria: 'x'.repeat(500) })).ok, true);
    });
  } finally { await db.close(); }
});

// Produção não tem a coluna legada `valor` (nem garantidamente `atualizado_em`): o UPDATE fixo
// da 202610010002 falhava em todo salvamento com `record "v_depois" has no field "valor"`.
test('edição de prêmios na tabela real (sem valor/atualizado_em): o PUT completo do painel salva', async () => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.premios_roleta (id bigint primary key, nome text not null, descricao_vitoria text, emoji text,
        probabilidade integer not null default 0, tipo text not null default 'produto', ativo boolean not null default false,
        codigo text, versao smallint default 2, participa_roleta boolean default true,
        canal_uso text not null default 'ambos' check (canal_uso in ('presencial','delivery','ambos')),
        custo_estimado numeric(12,2) not null default 0, expira_em_dias integer default 14,
        pesos_nivel integer[] not null default array[1,1,1,1,1,1], descricao_operacional text, imagem_url text);
      create table public.perfis_operacionais(user_id uuid primary key, email text, papel text, ativo boolean);
      create table public.seguranca_configuracoes(id integer, modo_contencao boolean);
      create table public.roleta_configuracoes(id integer, v2_modo_teste boolean);
      create table public.administracao_eventos(entidade text, entidade_id text, acao text, actor_user_id uuid, actor_email text, detalhes jsonb);
      insert into public.perfis_operacionais values ('${admin}','fixture@example.invalid','superadmin',true);
      insert into public.seguranca_configuracoes values (1,false);
      insert into public.roleta_configuracoes values (1,true);
      insert into public.premios_roleta(id,codigo,nome,descricao_vitoria,tipo,custo_estimado,pesos_nivel)
        values (7,'frete_v2','Taxa de entrega grátis','A próxima entrega é por nossa conta.','frete_gratis',8.5,array[2,2,2,2,2,2]);`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610010002_edicao_premios_auditada.sql', import.meta.url), 'utf8'));
    const update = async (changes: unknown) => (await db.query<{ result: { ok: boolean; code?: string; premio: Record<string, unknown> } }>(
      'select public.atualizar_premio_roleta($1,$2,$3::jsonb) as result', [7, admin, JSON.stringify(changes)])).rows[0].result;
    // Mesmo corpo que /admin/roleta envia ao clicar em "Salvar alterações".
    const painel = { nome: 'Entrega por nossa conta', descricao_vitoria: 'A próxima entrega é por nossa conta.', canal_uso: 'ambos',
      custo_estimado: 8.5, expira_em_dias: 14, pesos_nivel: [2,2,2,2,2,2], descricao_operacional: null };
    await assert.rejects(update(painel), /has no field "valor"/);
    await db.exec(await readFile(new URL('../supabase/migrations/202610020001_corrige_edicao_premios.sql', import.meta.url), 'utf8'));
    const result = await update(painel);
    assert.equal(result.ok, true); assert.equal(result.premio.nome, 'Entrega por nossa conta');
    assert.equal(result.premio.tipo, 'frete_gratis'); assert.equal(result.premio.ativo, false);
    const audit = (await db.query<{ detalhes: { campos_alterados: string[] } }>('select detalhes from public.administracao_eventos')).rows;
    assert.equal(audit.length, 1); assert.deepEqual(audit[0].detalhes.campos_alterados, ['nome']);
    assert.equal((await update({ valor: 10 })).code, 'invalid');
    assert.equal((await update({ nome: 'Ativa', ativo: true })).code, 'pilot');
    assert.equal((await db.query<{ nome: string }>('select nome from public.premios_roleta where id=7')).rows[0].nome, 'Entrega por nossa conta');
  } finally { await db.close(); }
});
