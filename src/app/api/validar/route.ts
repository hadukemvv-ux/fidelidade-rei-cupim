import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cupom: codigoRaw, acao } = body;

    if (!codigoRaw) {
      return NextResponse.json(
        { ok: false, error: 'Código vazio.' },
        { status: 400 }
      );
    }

    const codigo = codigoRaw.toString().trim().toUpperCase();

    // ============================
    // 1. Buscar cupom no banco
    // ============================
    const { data: cupom, error } = await supabaseAdmin
      .from('resgates')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) {
      console.error('[VALIDAR] Erro ao buscar cupom:', error);
      return NextResponse.json(
        { ok: false, error: 'Erro ao buscar cupom.' },
        { status: 500 }
      );
    }

    if (!cupom) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CÓDIGO NÃO ENCONTRADO',
          mensagem: 'Não existe registro para este código.'
        },
        { status: 404 }
      );
    }

    // ============================
    // 2. Verificar se está usado
    // ============================
    if (cupom.usado_em) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CUPOM JÁ UTILIZADO ❌',
          mensagem:
            `Este cupom foi usado em: ${new Date(
              cupom.usado_em
            ).toLocaleString('pt-BR')}`
        },
        { status: 400 }
      );
    }

    // ============================
    // 3. Construir objeto amigável
    // ============================
    const detalhes = {
      descricao_amigavel: cupom.premio_nome || cupom.tipo || 'Desconto Especial',
      telefone: cupom.telefone ?? 'Não informado',
      criado_em: cupom.criado_em,
      valor: cupom.valor,
      tipo: cupom.tipo,
      codigo: cupom.codigo
    };

    // ============================
    // A) CONSULTAR
    // ============================
    if (acao === 'consultar') {
      return NextResponse.json({
        ok: true,
        mensagem: 'Cupom disponível para uso.',
        detalhes
      });
    }

    // ============================
    // B) BAIXAR (usar cupom)
    // ============================
    if (acao === 'baixar') {
      const usadoEm = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('resgates')
        .update({ usado_em: usadoEm })
        .eq('id', cupom.id);

      if (updateError) {
        console.error('[VALIDAR] Erro ao baixar cupom:', updateError);
        return NextResponse.json(
          { ok: false, error: 'Erro ao salvar no banco.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        mensagem: 'SUCESSO! Cupom baixado e produto entregue.',
        detalhes: { ...detalhes, usado_em: usadoEm }
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Ação inválida.' },
      { status: 400 }
    );

  } catch (err: any) {
    console.error('[VALIDAR] Erro inesperado:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}