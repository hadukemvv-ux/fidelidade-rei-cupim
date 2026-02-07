import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ===========================================
// FINANCEIRO — CLIENTES (ALPHA)
// Retorna:
// - ranking por gasto
// - ticket médio por cliente
// - níveis (bronze/prata/ouro/rei)
// - distribuição por nível
// - top 10 clientes
// ===========================================

export async function GET() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*');

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        ranking: [],
        niveis: {},
        top10: [],
        gasto_medio_por_nivel: {}
      });
    }

    // ============================
    // 1 — RANKING (maior gasto)
    // ============================
    const ranking = [...clientes]
      .sort((a, b) => (b.total_gasto || 0) - (a.total_gasto || 0))
      .map((c, index) => ({
        posicao: index + 1,
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        nivel: c.nivel,
        total_gasto: c.total_gasto,
        pedidos: c.qtd_pedidos,
        ticket_medio:
          c.qtd_pedidos > 0 ? c.total_gasto / c.qtd_pedidos : 0
      }));

    // ============================
    // 2 — TOP 10 CLIENTES
    // ============================
    const top10 = ranking.slice(0, 10);

    // ============================
    // 3 — DISTRIBUIÇÃO DE NÍVEIS
    // ============================
    const niveis = {
      BRONZE: 0,
      PRATA: 0,
      OURO: 0,
      REI_DO_CUPIM: 0
    };

    clientes.forEach((c) => {
  const nivel = (c.nivel || "BRONZE").trim().toUpperCase();

  if (nivel in niveis) {
    (niveis as any)[nivel]++;
  }
});

    // ============================
    // 4 — MÉDIA DE GASTO POR NÍVEL
    // ============================
    const gastoPorNivel: any = {
  BRONZE: [],
  PRATA: [],
  OURO: [],
  REI_DO_CUPIM: []
};

clientes.forEach((c) => {
  const nivel = (c.nivel || "BRONZE").trim().toUpperCase();
  (gastoPorNivel[nivel] ?? gastoPorNivel["BRONZE"]).push(c.total_gasto || 0);
});

    const gasto_medio_por_nivel = Object.fromEntries(
      Object.entries(gastoPorNivel).map(([nivel, lista]: any) => [
        nivel,
        lista.length > 0
          ? lista.reduce((s: number, v: number) => s + v, 0) / lista.length
          : 0
      ])
    );

    return NextResponse.json({
      ranking,
      top10,
      niveis,
      gasto_medio_por_nivel
    });

  } catch (err: any) {
    console.error("ERRO /financeiro/clientes:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno." },
      { status: 500 }
    );
  }
}