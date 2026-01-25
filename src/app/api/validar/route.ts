import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Função para formatar data bonita
function formatarData(isoString: string) {
  return new Date(isoString).toLocaleString('pt-BR');
}

export async function POST(req: Request) {
  try {
    const { cupom, acao } = await req.json();

    if (!cupom) return NextResponse.json({ ok: false, error: 'Cupom não informado.' }, { status: 400 });

    const codigoLimpo = String(cupom).trim().toUpperCase();

        console.log(`🔍 [V2.0] VALIDANDO CUPOM SEM JOIN: ${codigoLimpo}`);

    // ✅ CORREÇÃO: Removemos o JOIN quebrado (.select('*, produtos_resgate(nome)'))
    // Buscamos apenas os dados do resgate primeiro
    const { data: resgate, error } = await supabaseAdmin
      .from('resgates')
      .select('*')
      .eq('codigo', codigoLimpo)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro Supabase (Busca Resgate):', error);
      return NextResponse.json({ ok: false, error: 'Erro interno ao consultar banco.' }, { status: 500 });
    }

    if (!resgate) {
      console.warn(`⚠️ Cupom ${codigoLimpo} não encontrado.`);
      return NextResponse.json({ ok: false, error: 'Cupom NÃO ENCONTRADO. Verifique o código.' }, { status: 404 });
    }

    // ✅ CORREÇÃO: Buscamos o nome do produto MANUALMENTE se houver produto_id
    let nomeProduto = null;
    if (resgate.produto_id) {
      const { data: prod } = await supabaseAdmin
        .from('produtos_resgate')
        .select('nome')
        .eq('id', resgate.produto_id)
        .maybeSingle();
      if (prod) nomeProduto = prod.nome;
    }

    // Se for apenas consulta (verificar status)
    if (acao === 'consultar') {
      if (resgate.usado_em) {
        return NextResponse.json({ 
          ok: false, 
          status: 'JA_USADO', 
          mensagem: `ATENÇÃO: Este cupom JÁ FOI USADO em ${formatarData(resgate.usado_em)}!`,
          detalhes: resgate 
        });
      }

      // Cupom Válido
      let descricao = '';
      if (resgate.tipo === 'frete') descricao = 'Entrega Grátis';
      else if (resgate.tipo === 'pontos') descricao = `Desconto de R$ ${Number(resgate.valor).toFixed(2)}`;
      else if (resgate.tipo === 'cashback') descricao = `Uso de Cashback: R$ ${Number(resgate.valor).toFixed(2)}`;
      // Usa o nome buscado manualmente ou um fallback
      else if (resgate.tipo === 'produto') descricao = `Produto: ${nomeProduto || 'Item do Cardápio'}`;

      return NextResponse.json({ 
        ok: true, 
        status: 'VALIDO', 
        mensagem: 'Cupom VÁLIDO e disponível para uso.',
        detalhes: { ...resgate, descricao_amigavel: descricao }
      });
    }

    // Se for para BAIXAR (Confirmar uso)
    if (acao === 'baixar') {
      if (resgate.usado_em) {
        return NextResponse.json({ ok: false, error: 'Este cupom já foi baixado anteriormente.' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('resgates')
        .update({ usado_em: new Date().toISOString() })
        .eq('id', resgate.id);

      if (updateError) throw updateError;

      return NextResponse.json({ ok: true, message: 'Cupom baixado com sucesso!' });
    }

    return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });

  } catch (err: any) {
    console.error('❌ Erro Geral:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}