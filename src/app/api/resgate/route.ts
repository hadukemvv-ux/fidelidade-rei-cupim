import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// =========================
// HELPERS
// =========================

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isoNow() {
  return new Date().toISOString();
}

function gerarCodigoCupom() {
  return 'CUP' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function calcularNivel(gastoTotal: number) {
  if (gastoTotal >= 600) return { atual: 'REI_DO_CUPIM', proximo: null, min: 600, max: 600, multiplicador: 14 };
  if (gastoTotal >= 300) return { atual: 'OURO', proximo: 'REI_DO_CUPIM', min: 300, max: 600, multiplicador: 10 };
  if (gastoTotal >= 100) return { atual: 'PRATA', proximo: 'OURO', min: 100, max: 300, multiplicador: 7 };
  return { atual: 'BRONZE', proximo: 'PRATA', min: 0, max: 100, multiplicador: 4 };
}

// ———————————————————————
// DETECTAR SE É PRÉ‑CADASTRO (AGORA INCLUINDO EMAIL)
// ———————————————————————
function isPreCadastro(cliente: any) {
  const nome = cliente?.nome || '';
  const dataNasc = cliente?.data_nascimento;
  const email = cliente?.email;
  const telefone = cliente?.telefone || '';
  const pin_hash = cliente?.pin_hash;

  let pinAutoHash = null;
  if (telefone.length >= 4) {
    const autoPin = telefone.substring(0, 4);
    pinAutoHash = crypto.createHash('sha256').update(autoPin).digest('hex');
  }

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !dataNasc ||
    !email ||
    (pin_hash && pin_hash === pinAutoHash)
  );
}


// =========================
// SNAPSHOT
// =========================
async function buscarSnapshot(telefone: string) {
  const { data: cliente } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle();

  if (!cliente) throw new Error('Cliente não encontrado.');

  const gastoAtual = Number(cliente.total_gasto || 0);
  const nivel = calcularNivel(gastoAtual);

  let progresso = 0;
  let faltamReais = 0;

  if (nivel.atual !== 'REI_DO_CUPIM') {
    const intervalo = nivel.max - nivel.min;
    progresso = Math.floor(((gastoAtual - nivel.min) / intervalo) * 100);
    progresso = Math.max(0, Math.min(100, progresso));
    faltamReais = Math.max(0, nivel.max - gastoAtual);
  } else {
    progresso = 100;
  }

  return {
    cliente: {
      nome: cliente.nome,
      telefone,
      email: cliente.email || null,
      data_nascimento: cliente.data_nascimento || null,
    },
    pontos: Number(cliente.pontos || 0),
    cashback: Number(cliente.cashback || 0),
    tickets: Number(cliente.tickets || 0),
    nivel: {
      atual: nivel.atual,
      proximo: nivel.proximo,
      progresso,
      faltamReais,
      multiplicadorAtual: nivel.multiplicador,
    },
  };
}


// =========================
// POST — CONSULTA OU RESGATE
// =========================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telefone = onlyDigits(body?.telefone || '');
    const pin = String(body?.pin || '').trim();
    const tipo = body?.tipo;

    if (telefone.length !== 11)
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });

    const { data: cliente } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    if (!cliente)
      return NextResponse.json({ ok: false, error: 'Cliente não encontrado.' }, { status: 404 });



    // ——————————————————
    // DETECÇÃO PROFISSIONAL DE PRÉ‑CADASTRO
    // ——————————————————
    const preCadastro = isPreCadastro(cliente);

    if (preCadastro && !tipo) {
      return NextResponse.json({
        ok: false,
        pre_cadastro: true,
        motivo: 'Seu cadastro foi iniciado pela Roleta. Para acessar sua conta, finalize seus dados.',
      });
    }


    // ——————————————————
    // CLIENTE COMPLETO → EXIGIR PIN CORRETO
    // ——————————————————
    if (!preCadastro) {
      if (!pin || pin.length !== 4)
        return NextResponse.json({ ok: false, error: 'PIN inválido.' }, { status: 400 });

      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

      if (!cliente.pin_hash)
        return NextResponse.json({ ok: false, error: 'Crie sua senha no cadastro.' }, { status: 401 });

      if (cliente.pin_hash !== pinHash)
        return NextResponse.json({ ok: false, error: 'PIN incorreto.' }, { status: 401 });
    }



    // ==================================================
    // CONSULTA SEM RESGATE
    // ==================================================
    if (!tipo) {
      const snap = await buscarSnapshot(telefone);
      return NextResponse.json({ ok: true, ...snap });
    }


    // ==================================================
    // RESGATE
    // ==================================================

    const hoje = new Date().toISOString().split('T')[0];

    const { data: jaResgatou } = await supabaseAdmin
      .from('resgates')
      .select('id')
      .eq('telefone', telefone)
      .gte('criado_em', `${hoje}T00:00:00`)
      .limit(1);

    if (jaResgatou && jaResgatou.length > 0) {
      return NextResponse.json({ ok: false, error: 'Limite de 1 resgate por dia.' }, { status: 400 });
    }


    const antes = await buscarSnapshot(telefone);
    let custoPontos = 0;
    let custoCash = 0;
    let nomePremio = '';
    const codigo = gerarCodigoCupom();


    // =========================
    // TIPOS DE RESGATE
    // =========================
    if (tipo === 'frete') {
      custoPontos = 200;
      nomePremio = 'Entrega Grátis';

    } else if (tipo === 'cashback') {
      const valor = Number(body.valorDesconto);
      if (![5,10,15].includes(valor)) {
        return NextResponse.json({ ok: false, error: 'Valor inválido.' }, { status: 400 });
      }
      custoCash = valor;
      nomePremio = `Desconto R$ ${valor}`;

    } else if (tipo === 'produto') {
      const { data: produto } = await supabaseAdmin
        .from('produtos_loja')
        .select('nome, custo_em_pontos, destaque')
        .eq('id', body.produtoId)
        .maybeSingle();

      if (!produto)
        return NextResponse.json({ ok: false, error: 'Produto não encontrado.' }, { status: 404 });

      nomePremio = produto.nome;
      custoPontos = produto.destaque
        ? Math.floor(produto.custo_em_pontos * 0.5)
        : produto.custo_em_pontos;

    } else {
      return NextResponse.json({ ok: false, error: 'Tipo inválido.' }, { status: 400 });
    }



    // =========================
    // VALIDAR SALDOS
    // =========================
    if (custoPontos > 0 && antes.pontos < custoPontos)
      return NextResponse.json({ ok: false, error: 'Pontos insuficientes.' }, { status: 400 });

    if (custoCash > 0 && antes.cashback < custoCash)
      return NextResponse.json({ ok: false, error: 'Cashback insuficiente.' }, { status: 400 });



    // =========================
    // ATUALIZAR SALDOS
    // =========================
    const novoSaldo = {
      atualizado_em: isoNow(),
      pontos: custoPontos > 0 ? antes.pontos - custoPontos : antes.pontos,
      cashback: custoCash > 0 ? antes.cashback - custoCash : antes.cashback,
    };

    const { error: updErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update(novoSaldo)
      .eq('telefone', telefone);

    if (updErr) throw updErr;



    // =========================
    // REGISTRO DO RESGATE
    // =========================
    await supabaseAdmin.from('resgates').insert({
      telefone,
      tipo,
      valor: custoCash > 0 ? custoCash : custoPontos,
      premio_nome: nomePremio,
      codigo,
      criado_em: isoNow(),
      produto_id: body.produtoId || null,
    });


    const depois = await buscarSnapshot(telefone);

    return NextResponse.json({ ok: true, codigo, atualizado: depois });


  } catch (err: any) {
    console.error('[RESGATE ERROR]:', err);
    return NextResponse.json({
      ok: false,
      error: err.message || 'Erro interno.',
    }, { status: 500 });
  }
}