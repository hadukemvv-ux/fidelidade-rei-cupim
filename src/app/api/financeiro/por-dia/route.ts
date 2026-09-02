import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';

export const dynamic = 'force-dynamic';

// ===============================
// FINANCEIRO — POR DIA (ALPHA)
// Baseado em:
// - total_gasto acumulado por cliente
// - qtd_pedidos
// Retorna os últimos 30 dias
// ===============================

export async function GET(request: Request) {
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
  try {
    // Carregar todos os clientes
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('total_gasto, qtd_pedidos, ultima_compra');

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        dias: [],
        media_diaria: 0
      });
    }

    // Criar linha do tempo (últimos 30 dias)
    const hoje = new Date();
    const dias: { data: string; faturamento: number; pedidos: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);

      dias.push({
        data: d.toISOString().split("T")[0],
        faturamento: 0,
        pedidos: 0
      });
    }

    // Distribuir faturamento dos clientes pelos dias
    // (ALPHA: usamos somente ultima_compra como referência)
    clientes.forEach((c) => {
      if (!c.ultima_compra) return;

      const dataStr = new Date(c.ultima_compra).toISOString().split("T")[0];

      const dia = dias.find((d) => d.data === dataStr);
      if (!dia) return;

      dia.faturamento += c.total_gasto || 0;
      dia.pedidos += c.qtd_pedidos || 0;
    });

    // Cálculo da média diária
    const total30dias = dias.reduce((s, d) => s + d.faturamento, 0);
    const media_diaria = total30dias / 30;

    return NextResponse.json({
      dias,
      media_diaria
    });

  } catch (err: any) {
    console.error("ERRO /financeiro/por-dia:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno." },
      { status: 500 }
    );
  }
}
