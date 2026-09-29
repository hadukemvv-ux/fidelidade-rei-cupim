import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/202609290001_entregas_premios.sql', import.meta.url), 'utf8');
const operator = '10000000-0000-4000-8000-000000000001';
const manualSession = '20000000-0000-4000-8000-000000000001';
const comandaSession = '20000000-0000-4000-8000-000000000002';
const alternateSession = '20000000-0000-4000-8000-000000000003';

async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.roleta_configuracoes (
      id integer primary key, v2_publicada boolean not null, v2_modo_teste boolean not null,
      texto_consentimento_versao text not null
    );
    create table public.roleta_sessoes (
      id uuid primary key, token_hash text unique not null, nivel integer not null,
      valor_comanda numeric not null, criado_por uuid, expira_em timestamptz not null,
      status text not null, girada_em timestamptz
    );
    create table public.comandas_roleta (sessao_id uuid, criado_por uuid);
    create table public.perfis_operacionais (
      user_id uuid primary key, ativo boolean not null, papel text not null,
      nome text not null, email text
    );
    create table public.premios_roleta (
      id bigint primary key, versao integer not null, ativo boolean not null,
      participa_roleta boolean not null, pesos_nivel integer[] not null,
      tipo text not null, nome text not null, descricao_vitoria text, emoji text,
      canal_uso text, custo_estimado numeric, dias_semana_validos smallint[] not null,
      expira_em_dias integer not null
    );
    create table public.cupons_promocionais (
      id uuid primary key default gen_random_uuid(), codigo_hash text, codigo_final text,
      cliente_id bigint, telefone_hash text, tipo_premio text not null, canal_uso text,
      status text not null, modo_teste boolean not null, valor_desconto_percentual numeric,
      custo_estimado numeric, dias_semana_validos smallint[] not null,
      nao_valido_feriado boolean not null, origem text, referencia_origem uuid,
      expira_em timestamptz not null, detalhes jsonb, usado_em timestamptz, usado_por uuid
    );
    create table public.roleta_giros (
      id uuid primary key default gen_random_uuid(), sessao_id uuid not null,
      cliente_id bigint, telefone_hash text, consentimento_marketing boolean,
      consentimento_versao text, premio_id bigint, cupom_id uuid not null,
      aleatorio numeric
    );
    create table public.consentimentos_marketing (
      cliente_id bigint, telefone_hash text, finalidade text, concedido boolean,
      texto_versao text, canal text, origem text, ip_hash text
    );
    create table public.cupom_eventos (
      cupom_id uuid, acao text, actor_user_id uuid, actor_nome text,
      actor_email text, actor_papel text, origem text, detalhes jsonb
    );
    create table public.seguranca_configuracoes (id integer primary key, modo_contencao boolean not null);
    create table public.feriados_operacionais (data date, ativo boolean);
    insert into auth.users values ('${operator}');
    insert into public.perfis_operacionais values ('${operator}', true, 'garcom', 'Operador de ensaio', null);
    insert into public.seguranca_configuracoes values (1, false);
    insert into public.roleta_configuracoes values (1, true, true, 'teste-v1');
    insert into public.roleta_sessoes values
      ('${manualSession}', 'qr-manual', 1, 120, '${operator}', now() + interval '1 hour', 'aberta', null),
      ('${comandaSession}', 'qr-comanda', 1, 120, '${operator}', now() + interval '1 hour', 'aberta', null),
      ('${alternateSession}', 'qr-alternativo', 1, 120, '${operator}', now() + interval '1 hour', 'aberta', null);
    insert into public.comandas_roleta values ('${comandaSession}', '${operator}');
    insert into public.premios_roleta values
      (1, 2, true, true, array[100,100,100,100,100,100], 'saideira', 'Saideira', 'Cerveja', null, 'salao', 0, array[1,2,3,4,5,6,7], 1),
      (2, 2, true, true, array[100,100,100,100,100,100], 'frete_gratis', 'Prêmio de ensaio', 'Ensaio', null, 'delivery', 0, array[1,2,3,4,5,6,7], 1);
  `);
  await db.exec(migration);
  return db;
}

async function spin(db: PGlite, token: string, random = 0) {
  const result = await db.query<{ result: { ok: boolean; motivo?: string; premio?: { nome: string; imagem_url?: string | null } } }>(
    `select public.girar_roleta_v2($1, 'phone-hash-fixture', null, false, 'teste-v1', 'teste', 'ip-hash-fixture', $2, 'code-' || $1, 'final') as result`,
    [token, random]
  );
  return result.rows[0].result;
}

test('SQL isolado: sessão manual não ganha físico nem permite novo giro', async () => {
  const db = await database();
  try {
    await db.exec('update public.entregas_configuracao set habilitado = true where id = 1');
    const display = await db.query<{ nome: string }>('select nome from public.listar_premios_elegiveis_v2($1)', [manualSession]);
    assert.deepEqual(display.rows.map((row) => row.nome), ['Prêmio de ensaio']);
    const first = await spin(db, 'qr-manual', 0);
    assert.equal(first.ok, true);
    assert.equal(first.premio?.nome, 'Prêmio de ensaio');
    const again = await spin(db, 'qr-manual', 0);
    assert.equal(again.ok, false);
    assert.match(again.motivo ?? '', /já foi utilizado/);
    const giro = await db.query<{ total: number }>(`select count(*)::integer as total from public.roleta_giros where sessao_id = '${manualSession}'`);
    assert.equal(giro.rows[0].total, 1);
  } finally { await db.close(); }
});

test('SQL isolado: gate de entregas desligado não sorteia físico nem cria pendência', async () => {
  const db = await database();
  try {
    const display = await db.query<{ nome: string }>('select nome from public.listar_premios_elegiveis_v2($1)', [comandaSession]);
    assert.deepEqual(display.rows.map((row) => row.nome), ['Prêmio de ensaio']);
    assert.equal((await spin(db, 'qr-comanda', 0)).premio?.nome, 'Prêmio de ensaio');
    const count = await db.query<{ total: number }>('select count(*)::integer as total from public.entregas_premios');
    assert.equal(count.rows[0].total, 0);
  } finally { await db.close(); }
});

test('SQL isolado: comanda válida gera um giro e uma pendência física', async () => {
  const db = await database();
  try {
    await db.exec('update public.entregas_configuracao set habilitado = true where id = 1');
    const display = await db.query<{ nome: string }>('select nome from public.listar_premios_elegiveis_v2($1)', [comandaSession]);
    assert.deepEqual(display.rows.map((row) => row.nome), ['Saideira', 'Prêmio de ensaio']);
    await db.exec("update public.premios_roleta set imagem_url = '/roleta/premios/saideira.webp' where id = 1");
    const image = await db.query<{ imagem_url: string | null }>('select imagem_url from public.listar_premios_elegiveis_v2($1) where nome = $2', [comandaSession, 'Saideira']);
    assert.equal(image.rows[0].imagem_url, '/roleta/premios/saideira.webp');
    await assert.rejects(db.exec("update public.premios_roleta set imagem_url = 'https://site-externo.test/foto.png' where id = 1"));
    await assert.rejects(db.exec("update public.premios_roleta set imagem_url = '//site-externo.test/foto.png' where id = 1"));
    const result = await spin(db, 'qr-comanda', 0);
    assert.equal(result.ok, true);
    assert.equal(result.premio?.nome, 'Saideira');
    assert.equal(result.premio?.imagem_url, '/roleta/premios/saideira.webp');
    const delivery = await db.query<{ status: string; quantidade: number }>(
      `select status, quantidade from public.entregas_premios where sessao_id = '${comandaSession}'`
    );
    assert.deepEqual(delivery.rows, [{ status: 'pendente', quantidade: 1 }]);
    assert.equal((await spin(db, 'qr-comanda', 0)).ok, false);
  } finally { await db.close(); }
});

test('SQL isolado: físico comercial não entra no sorteio com gate comercial fechado', async () => {
  const db = await database();
  try {
    await db.exec(`update public.entregas_configuracao set habilitado = true where id = 1;
      update public.roleta_configuracoes set v2_modo_teste = false where id = 1`);
    const display = await db.query<{ nome: string }>('select nome from public.listar_premios_elegiveis_v2($1)', [comandaSession]);
    assert.deepEqual(display.rows.map((row) => row.nome), ['Prêmio de ensaio']);
    const result = await spin(db, 'qr-comanda', 0);
    assert.equal(result.ok, true);
    assert.equal(result.premio?.nome, 'Prêmio de ensaio');
    const count = await db.query<{ total: number }>('select count(*)::integer as total from public.entregas_premios');
    assert.equal(count.rows[0].total, 0);
  } finally { await db.close(); }
});

test('SQL isolado: falta excepcional de comanda vira bloqueio auditável, não rollback', async () => {
  const db = await database();
  try {
    await db.exec('update public.entregas_configuracao set habilitado = true where id = 1');
    const cupom = await db.query<{ id: string }>(
      `insert into public.cupons_promocionais(tipo_premio, status, modo_teste, dias_semana_validos, nao_valido_feriado, expira_em)
       values ('saideira', 'teste', true, array[1,2,3,4,5,6,7], true, now() + interval '1 day') returning id`
    );
    await db.query(`insert into public.roleta_giros(sessao_id, cupom_id) values ($1, $2)`, [manualSession, cupom.rows[0].id]);
    const row = await db.query<{ status: string }>(
      `select status from public.entregas_premios where sessao_id = '${manualSession}'`
    );
    assert.equal(row.rows[0].status, 'bloqueada');
    await assert.rejects(db.query(`update public.cupons_promocionais set status = 'usado' where id = $1`, [cupom.rows[0].id]));
  } finally { await db.close(); }
});

test('SQL isolado: ativação recusa cupom físico antigo e aberto sem ledger', async () => {
  const db = await database();
  try {
    await db.exec(`insert into public.cupons_promocionais(tipo_premio, status, modo_teste, dias_semana_validos, nao_valido_feriado, expira_em)
      values ('saideira', 'teste', true, array[1,2,3,4,5,6,7], true, now() + interval '1 day')`);
    await assert.rejects(db.exec('update public.entregas_configuracao set habilitado = true where id = 1'));
    const config = await db.query<{ habilitado: boolean }>('select habilitado from public.entregas_configuracao where id = 1');
    assert.equal(config.rows[0].habilitado, false);
  } finally { await db.close(); }
});

test('SQL isolado: prêmio comercial passa por escolha, entrega única e cupom usado na mesma transação', async () => {
  const db = await database();
  try {
    await db.exec(`update public.entregas_configuracao set habilitado = true, permitir_comercial = true where id = 1;
      update public.roleta_configuracoes set v2_modo_teste = false where id = 1`);
    assert.equal((await spin(db, 'qr-comanda', 0)).premio?.nome, 'Saideira');
    const delivery = await db.query<{ id: string; cupom_id: string; modo_teste: boolean }>(
      `select id, cupom_id, modo_teste from public.entregas_premios where sessao_id = '${comandaSession}'`
    );
    const item = delivery.rows[0];
    assert.equal(item.modo_teste, false);
    const product = await db.query<{ id: string }>(
      `insert into public.entregas_produtos(nome, unidade, categoria, ativo)
       values ('Cerveja de ensaio', 'garrafa 600 ml', 'cerveja', true) returning id`
    );
    await db.query('insert into public.entregas_opcoes(entrega_id, produto_id) values ($1, $2)', [item.id, product.rows[0].id]);
    const mutate = async (action: string, version: number, productId: string | null) => {
      const result = await db.query<{ result: { ok: boolean; versao?: number } }>(
        'select public.registrar_entrega_premio($1::uuid, $2::uuid, $3::text, $4::integer, $5::uuid) as result',
        [item.id, operator, action, version, productId]
      );
      return result.rows[0].result;
    };
    assert.equal((await mutate('selecionar', 0, product.rows[0].id)).ok, true);
    assert.equal((await mutate('entregar', 1, null)).ok, true);
    assert.equal((await mutate('entregar', 1, null)).ok, false);
    const state = await db.query<{ status: string; quantidade: number; lancado_em: string | null }>(
      'select status, quantidade, lancado_em from public.entregas_premios where id = $1', [item.id]
    );
    assert.equal(state.rows[0].status, 'entregue');
    assert.equal(state.rows[0].quantidade, 1);
    assert.equal(state.rows[0].lancado_em, null);
    const coupon = await db.query<{ status: string }>('select status from public.cupons_promocionais where id = $1', [item.cupom_id]);
    assert.equal(coupon.rows[0].status, 'usado');
    const events = await db.query<{ total: number }>('select count(*)::integer as total from public.entregas_eventos where entrega_id = $1', [item.id]);
    assert.equal(events.rows[0].total, 3);
  } finally { await db.close(); }
});

test('SQL isolado: papéis públicos não recebem permissões nas entregas e no RPC', async () => {
  const db = await database();
  try {
    const privileges = await db.query<{ anon_table: boolean; authenticated_table: boolean; anon_rpc: boolean; anon_list: boolean; service_rpc: boolean }>(`
      select has_table_privilege('anon', 'public.entregas_premios', 'SELECT') as anon_table,
        has_table_privilege('authenticated', 'public.entregas_premios', 'UPDATE') as authenticated_table,
        has_function_privilege('anon', 'public.registrar_entrega_premio(uuid,uuid,text,integer,uuid)', 'EXECUTE') as anon_rpc,
        has_function_privilege('anon', 'public.listar_premios_elegiveis_v2(uuid)', 'EXECUTE') as anon_list,
        has_function_privilege('service_role', 'public.registrar_entrega_premio(uuid,uuid,text,integer,uuid)', 'EXECUTE') as service_rpc
    `);
    assert.deepEqual(privileges.rows[0], { anon_table: false, authenticated_table: false, anon_rpc: false, anon_list: false, service_rpc: true });
  } finally { await db.close(); }
});
