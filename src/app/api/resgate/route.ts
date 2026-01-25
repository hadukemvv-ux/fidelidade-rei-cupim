import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// --- FUNÇÕES AUXILIARES ---

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

function gerarCodigoCupom() {
  return 'CUP' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// --- LÓGICA DE NÍVEIS (Baseada em Gasto ACUMULADO / LIFETIME) ---
function calcularNivel(gastoTotal: number) {
  // Rei do Cupim: Acima de R$ 700 acumulados na vida
  if (gastoTotal >= 700) {
    return { atual: 'REI_DO_CUPIM', proximo: 'MÁXIMO', min: 700, max: 700, multiplicador: 14 };
  }
  // Ouro: R$ 400 - 699
  if (gastoTotal >= 400) {
    return { atual: 'OURO', proximo: 'REI_DO_CUPIM', min: 400, max: 700, multiplicador: 8 };
  }
  // Prata: R$ 200 - 399
  if (gastoTotal >= 200) {
    return { atual: 'PRATA', proximo: 'OURO', min: 200, max: 400, multiplicador: 4 };
  }
  
  // Bronze: R$ 0 - 199
  return { atual: 'BRONZE', proximo: 'PRATA', min: 0, max: 200, multiplicador: 2 };
}

// Garante que o cliente tenha linhas em todas as tabelas de saldo
async function garantirSaldos(telefone: string) {
  const { data: p } = await supabaseAdmin.from('pontos').select('telefone').eq('telefone', telefone).maybeSingle();
  if (!p) await supabaseAdmin.from('pontos').insert({ telefone, total: 0, nivel: 'BRONZE', gasto_mensal_atual: 0, atualizado_em: nowIso() });

  const { data: c } = await supabaseAdmin.from('cashback').select('telefone').eq('telefone', telefone).maybeSingle();
  if (!c) await supabaseAdmin.from('cashback').insert({ telefone, saldo: 0, atualizado_em: nowIso() });

  const { data: t } = await supabaseAdmin.from('tickets').select('telefone').eq('telefone', telefone).maybeSingle();
  if (!t) await supabaseAdmin.from('tickets').insert({ telefone, quantidade: 0, atualizado_em: nowIso() });
}

async function buscarSnapshot(telefone: string) {
  const { data: cliente } = await supabaseAdmin.from('clientes').select('nome, ultima_compra').eq('telefone', telefone).single();
  if (!cliente) throw new Error('Cliente não encontrado.');

  await garantirSaldos(telefone);

  // Consultas com verificação de erro implícita
  const { data: pts } = await supabaseAdmin.from('pontos').select('telefone, total, nivel, gasto_mensal_atual, atualizado_em').eq('telefone', telefone).maybeSingle();
  const { data: cb } = await supabaseAdmin.from('cashback').select('*').eq('telefone', telefone).maybeSingle();
  const { data: tk } = await supabaseAdmin.from('tickets').select('*').eq('telefone', telefone).maybeSingle();

  // ✅ CORREÇÃO AQUI: Uso de ?. para evitar erro "is possibly null"
  const gastoAtual = Number(pts?.gasto_mensal_atual || 0);
  const nivelInfo = calcularNivel(gastoAtual);

  // Calcula progresso da barra
  let progresso = 0;
  let pontosParaProximo = 0; 
  
  if (nivelInfo.atual !== 'REI_DO_CUPIM') {
    const span = Math.max(1, nivelInfo.max - nivelInfo.min);
    const percorridos = Math.max(0, gastoAtual - nivelInfo.min);
    progresso = Math.min(100, Math.floor((percorridos / span) * 100));
    
    const reaisFaltantes = Math.max(0, nivelInfo.max - gastoAtual);
    pontosParaProximo = Math.ceil(reaisFaltantes * nivelInfo.multiplicador); 
  } else {
    progresso = 100;
  }

  let avisoInatividade = '';
  if (cliente.ultima_compra) {
    const dias = Math.floor((new Date().getTime() - new Date(cliente.ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
    if (dias >= 60) avisoInatividade = 'ATENÇÃO: Seus benefícios e nível serão zerados em breve por inatividade.';
    else if (dias >= 30) avisoInatividade = `Faltam ${60 - dias} dias para seu nível ser zerado por inatividade.`;
  }

  return {
    cliente: { nome: cliente.nome, telefone },
    // ✅ CORREÇÃO AQUI TAMBÉM: Proteção contra nulos
    pontos: Number(pts?.total || 0),
    cashback: Number(cb?.saldo || 0),
    tickets: Number(tk?.quantidade || 0),
    nivel: { 
      atual: nivelInfo.atual, 
      proximo: nivelInfo.proximo, 
      progresso, 
      pontosParaProximo, 
      multiplicadorAtual: nivelInfo.multiplicador 
    },
    avisoInatividade
  };
}

// --- ROTA PRINCIPAL ---

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const telefone = onlyDigits(String(body?.telefone ?? ''));
    const pin = String(body?.pin ?? '').trim();

    if (telefone.length !== 11) {
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });
    }

    // Validação do PIN
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN precisa ter exatamente 4 dígitos numéricos.' }, { status: 400 });
    }

    // Verificar PIN
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    const { data: cliente } = await supabaseAdmin.from('clientes').select('pin_hash').eq('telefone', telefone).maybeSingle();
    if (!cliente || cliente.pin_hash !== pinHash) {
      return NextResponse.json({ ok: false, error: 'PIN incorreto.' }, { status: 401 });
    }

    const tipo = body?.tipo as 'frete' | 'cashback' | 'produto' | 'pontos' | undefined;

    if (!tipo) {
      const snap = await buscarSnapshot(telefone);
      return NextResponse.json({ ok: true, ...snap });
    }

    // Resgate (1x dia)
    const hoje = new Date().toISOString().split('T')[0];
    const { data: jaResgatou } = await supabaseAdmin.from('resgates')
      .select('id').eq('telefone', telefone).gte('criado_em', `${hoje}T00:00:00`).maybeSingle();

    if (jaResgatou) {
      return NextResponse.json({ ok: false, error: 'Limite atingido: Você só pode fazer 1 resgate por dia.' }, { status: 400 });
    }

    const antes = await buscarSnapshot(telefone);
    const codigo = gerarCodigoCupom();
    let custoEmPontos = 0;
    const nivelAtual = antes.nivel.atual;

    if (tipo === 'frete') {
      custoEmPontos = 200;
    } else if (tipo === 'pontos') {
      const valorReais = Number(body.valorDesconto);
      if (!valorReais || valorReais <= 0) return NextResponse.json({ ok: false, error: 'Valor inválido.' }, { status: 400 });
      custoEmPontos = valorReais / 0.005;
    } else if (tipo === 'produto') {
      const { data: produto } = await supabaseAdmin.from('produtos_resgate').select('*').eq('id', body.produtoId).single();
      if (!produto) return NextResponse.json({ ok: false, error: 'Produto não encontrado.' }, { status: 404 });
      
      // Ajuste de custos de produtos se necessário, baseado no nível
      if (nivelAtual === 'PRATA') custoEmPontos = produto.custo_prata;
      else if (nivelAtual === 'OURO') custoEmPontos = produto.custo_ouro;
      else if (nivelAtual === 'REI_DO_CUPIM') custoEmPontos = produto.custo_rei;
      else custoEmPontos = produto.custo_em_pontos;
    } else if (tipo === 'cashback') {
      const valorDebito = Number(body.valorDesconto);
      if (antes.cashback < valorDebito) {
        return NextResponse.json({ ok: false, error: 'Saldo de cashback insuficiente.' }, { status: 400 });
      }
      await supabaseAdmin.from('cashback').update({ saldo: antes.cashback - valorDebito, atualizado_em: nowIso() }).eq('telefone', telefone);
      await supabaseAdmin.from('resgates').insert({ telefone, tipo, valor: valorDebito, codigo, criado_em: nowIso() });
      const posCashback = await buscarSnapshot(telefone);
      return NextResponse.json({ ok: true, codigo, atualizado: posCashback });
    }
    
    if (antes.pontos < custoEmPontos) {
      return NextResponse.json({ ok: false, error: `Pontos insuficientes. Necessário: ${custoEmPontos} pts.` }, { status: 400 });
    }

    await supabaseAdmin.from('pontos').update({ total: antes.pontos - custoEmPontos, atualizado_em: nowIso() }).eq('telefone', telefone);
    await supabaseAdmin.from('resgates').insert({ telefone, tipo, valor: custoEmPontos, codigo, produto_id: body.produtoId || null, criado_em: nowIso() });

    const depois = await buscarSnapshot(telefone);
    return NextResponse.json({ ok: true, codigo, atualizado: depois });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? 'Erro interno.' }, { status: 500 });
  }
}