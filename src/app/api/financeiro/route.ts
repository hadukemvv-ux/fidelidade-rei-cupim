import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ===============================
// DASHBOARD FINANCEIRA — OVERVIEW (ALPHA)
// Focado em:
// - total faturado
// - pedidos
// - ticket médio
// - novos clientes
// - recorrência
// - impacto fidelidade
// ===============================

export async function GET() {
  try {
    // Carregar clientes
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*');

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        faturamento_total: 0,
        total_pedidos: 0,
        ticket_medio: 0,
        clientes_unicos: 0,
        novos_clientes_30dias: 0,
        clientes_recorrentes: 0,
        impacto_cashback: 0,
        impacto_pontos: 0
      });
    }

    // ===============================
    // 1) FATURAMENTO TOTAL (ALPHA)
    // ===============================
    const faturamento_total = clientes.reduce(
      (soma, c) => soma + (c.total_gasto || 0),
      0
    );

    // ===============================
    // 2) TOTAL DE PEDIDOS
    // ===============================
    const total_pedidos = clientes.reduce(
      (soma, c) => soma + (c.qtd_pedidos || 0),
      0
    );

    // ===============================
    // 3) TICKET MÉDIO
    // ===============================
    const ticket_medio =
      total_pedidos > 0 ? faturamento_total / total_pedidos : 0;

    // ===============================
    // 4) CLIENTES ÚNICOS
    // ===============================
    const clientes_unicos = clientes.length;

    // ===============================
    // 5) NOVOS CLIENTES (últimos 30 dias)
    // ===============================
    const agora = new Date();
    const dias30 = new Date();
    dias30.setDate(agora.getDate() - 30);

    const novos_clientes_30dias = clientes.filter((c) => {
      if (!c.primeira_compra) return false;
      const data = new Date(c.primeira_compra);
      return data >= dias30;
    }).length;

    // ===============================
    // 6) CLIENTES RECORRENTES
    // ===============================
    const clientes_recorrentes = clientes.filter(
      (c) => (c.qtd_pedidos || 0) > 1
    ).length;

    // ===============================
    // 7) IMPACTO CASHBACK
    // ===============================
    const impacto_cashback = clientes.reduce(
      (soma, c) => soma + (c.cashback || 0),
      0
    );

    // ===============================
    // 8) IMPACTO PONTOS (estimativa simples)
    // ===============================
    const impacto_pontos = clientes.reduce(
      (soma, c) => soma + (c.pontos || 0),
      0
    );

    return NextResponse.json({
      faturamento_total,
      total_pedidos,
      ticket_medio,
      clientes_unicos,
      novos_clientes_30dias,
      clientes_recorrentes,
      impacto_cashback,
      impacto_pontos
    });

  } catch (err: any) {
    console.error('ERRO /api/financeiro/overview:', err);
    return NextResponse.json(
      { erro: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}