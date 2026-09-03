import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { getNivelPorGasto, type NivelFidelidade } from '@/lib/fidelidade-rules';

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

export async function GET(request: Request) {
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
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

    const clientesComNivel = clientes.map((cliente) => ({
      ...cliente,
      nivel: getNivelPorGasto(Number(cliente.gasto_90_dias ?? cliente.total_gasto ?? 0)).nivel,
    }));

    // ============================
    // 1 — RANKING (maior gasto)
    // ============================
    const ranking = [...clientesComNivel]
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
    const niveis: Record<NivelFidelidade, number> = {
      BRONZE: 0,
      PRATA: 0,
      OURO: 0,
      REI: 0
    };

    clientesComNivel.forEach((cliente) => {
      const nivel = cliente.nivel as NivelFidelidade;
      niveis[nivel] += 1;
    });

    // ============================
    // 4 — MÉDIA DE GASTO POR NÍVEL
    // ============================
    const gastoPorNivel: Record<NivelFidelidade, number[]> = {
      BRONZE: [],
      PRATA: [],
      OURO: [],
      REI: [],
    };

    clientesComNivel.forEach((cliente) => {
      const nivel = cliente.nivel as NivelFidelidade;
      gastoPorNivel[nivel].push(Number(cliente.total_gasto || 0));
    });

    const gasto_medio_por_nivel = Object.fromEntries(
      Object.entries(gastoPorNivel).map(([nivel, lista]) => [
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

  } catch (err: unknown) {
    console.error("ERRO /financeiro/clientes:", err);
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 }
    );
  }
}
