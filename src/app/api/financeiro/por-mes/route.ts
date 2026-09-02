import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';

export const dynamic = 'force-dynamic';

// ========================================
// FINANCEIRO — POR MÊS (ALPHA)
// Baseado em:
//  - total_gasto (acumulado por cliente)
//  - qtd_pedidos
//  - ultima_compra
//
// Retorna os últimos 12 meses
// ========================================

export async function GET(request: Request) {
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
  try {
    // Buscar clientes
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('total_gasto, qtd_pedidos, ultima_compra');

    if (error) throw error;

    // Caso vazio
    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        meses: [],
        media_mensal: 0
      });
    }

    // Construir os últimos 12 meses
    const hoje = new Date();
    const meses: { mes: string; faturamento: number; pedidos: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);

      const ano = ref.getFullYear();
      const mes = (ref.getMonth() + 1).toString().padStart(2, '0');

      meses.push({
        mes: `${ano}-${mes}`, // formato YYYY-MM
        faturamento: 0,
        pedidos: 0
      });
    }

    // Distribuir total_gasto no mês da ultima_compra
    clientes.forEach((c) => {
      if (!c.ultima_compra) return;

      const data = new Date(c.ultima_compra);
      const chave = `${data.getFullYear()}-${(data.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;

      const mesEntry = meses.find((m) => m.mes === chave);
      if (!mesEntry) return;

      mesEntry.faturamento += c.total_gasto || 0;
      mesEntry.pedidos += c.qtd_pedidos || 0;
    });

    // Média mensal
    const soma12 = meses.reduce((s, m) => s + m.faturamento, 0);
    const media_mensal = soma12 / 12;

    return NextResponse.json({
      meses,
      media_mensal
    });
  } catch (err: any) {
    console.error("ERRO /financeiro/por-mes:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno." },
      { status: 500 }
    );
  }
}
