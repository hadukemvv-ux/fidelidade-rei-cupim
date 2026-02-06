import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Helpers
function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function iso() {
  return new Date().toISOString();
}

function validarEmail(email?: string | null) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(e) ? e : null;
}

function validarDataNascimento(str?: string | null) {
  if (!str) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  const ano = d.getFullYear();
  const hoje = new Date();

  if (ano < 1920) return null;
  if (d > hoje) return null;

  return str;
}

async function registrarExtrato(cliente_id: number, valor: number, descricao: string) {
  try {
    await supabaseAdmin.from('extrato_pontos').insert({
      cliente_id,
      tipo: 'entrada',
      valor,
      origem: 'SISTEMA',
      descricao,
      criado_em: iso(),
      metodo: 'cadastro'
    });
  } catch (e) {
    console.log('⚠️ Extrato falhou:', e);
  }
}

// Detectar PRÉ‑CADASTRO (roleta)
function isPreCadastro(cliente: any) {
  const nome = cliente?.nome || '';
  const dataNasc = cliente?.data_nascimento;
  const email = cliente?.email;
  const telefone = cliente?.telefone;
  const pin_hash = cliente?.pin_hash;

  // PIN automático gerado pela roleta
  let pinAutoHash = null;
  if (telefone?.length >= 4) {
    const autoPin = telefone.substring(0, 4);
    pinAutoHash = crypto.createHash('sha256').update(autoPin).digest('hex');
  }

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !dataNasc ||
    !email ||
    (pinAutoHash && pin_hash === pinAutoHash)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nomeNovo = String(body?.nome ?? '').trim();
    const emailNovo = validarEmail(body?.email);
    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const pin = String(body?.pin ?? '').trim();
    const dataNascimentoNova = validarDataNascimento(body?.data_nascimento);

    // -------------------------
    // Validações iniciais
    // -------------------------
    if (nomeNovo.length < 3)
      return NextResponse.json({ ok: false, error: 'Nome inválido.' }, { status: 400 });

    if (!emailNovo)
      return NextResponse.json({ ok: false, error: 'Email inválido.' }, { status: 400 });

    if (telefone.length !== 11)
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });

    if (!/^\d{4}$/.test(pin))
      return NextResponse.json({ ok: false, error: 'PIN inválido (4 dígitos).' }, { status: 400 });

    const pin_hash = crypto.createHash('sha256').update(pin).digest('hex');

    // -------------------------
    // CHECAR EMAIL DUPLICADO
    // -------------------------
    const { data: emailExistente } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone')
      .eq('email', emailNovo)
      .maybeSingle();

    if (emailExistente && emailExistente.telefone !== telefone) {
      return NextResponse.json(
        { ok: false, error: 'Este email já está em uso por outro cliente.' },
        { status: 409 }
      );
    }

    // -------------------------
    // Buscar cliente pelo telefone
    // -------------------------
    const { data: encontrados, error: errBusca } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone);

    if (errBusca) throw errBusca;

    // ================================================================
    // CASO 1 — CRIAÇÃO NORMAL (não existe cliente com este telefone)
    // ================================================================
    if (!encontrados || encontrados.length === 0) {
      const bonus = dataNascimentoNova ? 200 : 0;

      const { data: novo, error: errIns } = await supabaseAdmin
        .from('base_clientes_saipos')
        .insert({
          nome: nomeNovo,
          email: emailNovo,
          telefone,
          pin_hash,
          data_nascimento: dataNascimentoNova,
          pontos: bonus,
          cashback: 0,
          tickets: 0,
          nivel: 'BRONZE',
          total_gasto: 0,
          qtd_pedidos: 0,
          primeira_compra: null,
          ultima_compra: null,
          atualizado_em: iso()
        })
        .select('*')
        .single();

      if (errIns) throw errIns;

      if (bonus > 0)
        await registrarExtrato(novo.id, bonus, 'Bônus de Cadastro');

      return NextResponse.json({
        ok: true,
        criado: true,
        message: 'Cadastro realizado com sucesso!'
      });
    }

    // ================================================================
    // CASO 2 — EXISTE 1 ÚNICO CLIENTE COM ESTE TELEFONE
    // ================================================================
    if (encontrados.length === 1) {
      const cliente = encontrados[0];
      const preCadastro = isPreCadastro(cliente);

      // ---------------------------------------------------------
      // PRÉ‑CADASTRO → PODE completar TODOS os dados
      // ---------------------------------------------------------
      if (preCadastro) {
        const updateData: any = {
          nome: nomeNovo,
          email: emailNovo,
          data_nascimento: dataNascimentoNova,
          pin_hash,
          atualizado_em: iso(),
        };

        const { error: updErr } = await supabaseAdmin
          .from('base_clientes_saipos')
          .update(updateData)
          .eq('id', cliente.id);

        if (updErr) throw updErr;

        return NextResponse.json({
          ok: true,
          atualizado: true,
          message: 'Cadastro finalizado com sucesso!'
        });
      }

      // ---------------------------------------------------------
      // CLIENTE COMPLETO → VALIDAR BLOQUEIOS
      // ---------------------------------------------------------
      if (cliente.nome !== nomeNovo)
        return NextResponse.json(
          { ok: false, error: 'Este número já possui cadastro. O nome não pode ser alterado.' },
          { status: 403 }
        );

      if (cliente.data_nascimento && cliente.data_nascimento !== dataNascimentoNova)
        return NextResponse.json(
          { ok: false, error: 'Data de nascimento não pode ser alterada após cadastro.' },
          { status: 403 }
        );

      if (cliente.email && cliente.email !== emailNovo)
        return NextResponse.json(
          { ok: false, error: 'Email não pode ser alterado após cadastro.' },
          { status: 403 }
        );

      if (cliente.pin_hash && cliente.pin_hash !== pin_hash)
        return NextResponse.json(
          { ok: false, error: 'PIN incorreto. Para alterar, use "Esqueci meu PIN".' },
          { status: 401 }
        );

      // ---------------------------------------------------------
      // COMPLETAR CAMPOS FALTANTES
      // ---------------------------------------------------------
      const updateData: any = { atualizado_em: iso() };

      if (!cliente.email) updateData.email = emailNovo;
      if (!cliente.data_nascimento) updateData.data_nascimento = dataNascimentoNova;
      if (!cliente.pin_hash) updateData.pin_hash = pin_hash;

      const { error: updErr } = await supabaseAdmin
        .from('base_clientes_saipos')
        .update(updateData)
        .eq('id', cliente.id);

      if (updErr) throw updErr;

      return NextResponse.json({
        ok: true,
        atualizado: true,
        message: 'Cadastro já existia — dados complementares adicionados.'
      });
    }

    // ================================================================
    // CASO 3 — DUPLICADOS → UNIFICAR
    // ================================================================
    const ids = encontrados.map((c) => c.id);
    const principal = encontrados[0];
    const paraExcluir = ids.slice(1);

    await supabaseAdmin
      .from('base_clientes_saipos')
      .delete()
      .in('id', paraExcluir);

    return NextResponse.json({
      ok: true,
      unificado: true,
      message: 'Cadastro unificado. Faça login novamente.'
    });

  } catch (err: any) {
    console.error('❌ ERRO CADASTRO:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}