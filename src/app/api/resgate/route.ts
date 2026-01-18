import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { telefone, tipo, valorDesconto } = await request.json();

    if (!telefone || !tipo || valorDesconto === undefined) {
  return NextResponse.json({ error: 'Telefone, tipo e valor de desconto obrigatórios' }, { status: 400 });
}

    const tel = telefone.replace(/\D/g, '').trim();

    // Busca dados atuais
    const [pontosRes, cashbackRes] = await Promise.all([
      supabase.from('pontos').select('total').eq('telefone', tel).single(),
      supabase.from('cashback').select('saldo').eq('telefone', tel).single(),
    ]);

    let pontosAtuais = pontosRes.data?.total || 0;
    let cashbackAtual = cashbackRes.data?.saldo || 0;

    let pontosGastos = 0;
    if (tipo === 'pontos') {
      pontosGastos = valorDesconto * 20;  // R$ 1 desconto = 20 pontos (ajuste se quiser)
      if (pontosAtuais < pontosGastos) {
        return NextResponse.json({ error: 'Pontos insuficientes' }, { status: 400 });
      }
      pontosAtuais -= pontosGastos;
      await supabase.from('pontos').update({ total: pontosAtuais }).eq('telefone', tel);
    } else if (tipo === 'cashback') {
      if (cashbackAtual < valorDesconto) {
        return NextResponse.json({ error: 'Cashback insuficiente' }, { status: 400 });
      }
      cashbackAtual -= valorDesconto;
      await supabase.from('cashback').update({ saldo: cashbackAtual }).eq('telefone', tel);
    } else if (tipo === 'frete') {
      pontosGastos = 300;  // 300 pontos para frete grátis
      if (pontosAtuais < pontosGastos) {
        return NextResponse.json({ error: 'Pontos insuficientes para frete grátis' }, { status: 400 });
      }
      pontosAtuais -= pontosGastos;
      await supabase.from('pontos').update({ total: pontosAtuais }).eq('telefone', tel);
    }

    // Gera código único e seguro (prefixo + aleatório longo)
    const codigo = `RESGATE-${tipo.toUpperCase()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    // Retorna o código e valores atualizados
    return NextResponse.json({
      codigo,
      atualizado: {
        pontos: pontosAtuais,
        cashback: cashbackAtual,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno no resgate' }, { status: 500 });
  }
}