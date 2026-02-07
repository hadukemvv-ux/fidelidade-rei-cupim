import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ======================================================
// FINANCEIRO — FIDELIDADE (ALPHA)
// Coleta:
// - Total de pontos acumulados
// - Total de cashback acumulado
// - Valor econômico estimado dos pontos
// - ROI do programa
// - Top usuários por acúmulo de vantagens
//
// Baseado somente na tabela:
// base_clientes_saipos
// ======================================================

export async function GET() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*');

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        total_pontos: 0,
        total_cashback: 0,
        valor_pontos: 0,
        custo_programa: 0,
        custo_relativo: 0,
        roi: 0,
        top_beneficiados: []
      });
    }

    // =======================================
    // SOMAS GERAIS
    // =======================================
    const total_pontos = clientes.reduce(
      (s, c) => s + (c.pontos || 0),
      0
    );

    const total_cashback = clientes.reduce(
      (s, c) => s + (c.cashback || 0),
      0
    );

    const faturamento_total = clientes.reduce(
      (s, c) => s + (c.total_gasto || 0),
      0
    );

    // =======================================
    // VALOR ECONÔMICO DOS PONTOS
    // (estimativa simples → 100 pts = R$1)
    // =======================================
    const valor_pontos = total_pontos / 100;

    // =======================================
    // CUSTO DO PROGRAMA (ALPHA)
    // pontos + cashback
    // =======================================
    const custo_programa = valor_pontos + total_cashback;

    // % do custo sobre o faturamento
    const custo_relativo =
      faturamento_total > 0
        ? (custo_programa / faturamento_total) * 100
        : 0;

    // =======================================
    // ROI ESTIMADO
    //
    // SE O PROGRAMA AUMENTA A FREQUÊNCIA,
    // consideramos ROI como:
    //
    // ROI = (faturamento - custo_programa) / custo_programa
    //
    // (métrica simples para Alpha)
    // =======================================
    const roi =
      custo_programa > 0
        ? (faturamento_total - custo_programa) / custo_programa
        : 0;

    // =======================================
    // TOP CLIENTES QUE MAIS ACUMULAM
    // =======================================
    const top_beneficiados = [...clientes]
      .sort((a, b) => {
        const va = (a.cashback || 0) + (a.pontos || 0) / 100;
        const vb = (b.cashback || 0) + (b.pontos || 0) / 100;
        return vb - va;
      })
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        nivel: c.nivel,
        pontos: c.pontos,
        cashback: c.cashback,
        valor_total: (c.pontos || 0) / 100 + (c.cashback || 0)
      }));

    return NextResponse.json({
      total_pontos,
      total_cashback,
      valor_pontos,

      custo_programa,
      custo_relativo, // em %
      roi,            // retorno do programa

      top_beneficiados
    });

  } catch (err: any) {
    console.error("ERRO /financeiro/fidelidade:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno." },
      { status: 500 }
    );
  }
}