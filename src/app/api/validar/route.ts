import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { cupom, telefone } = await request.json();

    if (!cupom || !telefone) {
      return NextResponse.json({ error: 'Código do cupom e telefone obrigatórios' }, { status: 400 });
    }

    const tel = telefone.replace(/\D/g, '').trim();

    // Busca o cupom no banco (tabela 'cupons_resgatados' ou similar - vamos criar essa tabela depois)
    const { data: cupomData, error } = await supabase
      .from('cupons_resgatados') // Nome da tabela que vamos criar
      .select('*')
      .eq('codigo', cupom.trim().toUpperCase())
      .eq('telefone', tel)
      .single();

    if (error || !cupomData) {
      return NextResponse.json({ error: 'Cupom inválido ou não encontrado para este telefone' }, { status: 400 });
    }

    if (cupomData.usado) {
      return NextResponse.json({ error: 'Cupom já foi utilizado' }, { status: 400 });
    }

    // Marca como usado
    await supabase
      .from('cupons_resgatados')
      .update({ usado: true, usado_em: new Date().toISOString() })
      .eq('id', cupomData.id);

    return NextResponse.json({
      valido: true,
      tipo: cupomData.tipo,
      valorDesconto: cupomData.valorDesconto,
      mensagem: 'Cupom válido! Aplique o desconto correspondente no pedido.'
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno na validação' }, { status: 500 });
  }
}