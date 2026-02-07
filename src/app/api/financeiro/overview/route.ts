import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('total_gasto, qtd_pedidos, updated_at');

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({
        faturamento_total: 0,
        ticket_medio: 0,
        total_pedidos: 0,
        clientes_unicos: 0,
        novos_clientes_30dias: 0,
        clientes_recorrentes: 0
      });
    }

    // Faturamento total
    const faturamento_total = clientes.reduce(
      (s, c) => s + (c.total_gasto || 0),
      0
    );

    // Total de pedidos
    const total_pedidos = clientes.reduce(
      (s, c) => s + (c.qtd_pedidos || 0),
      0
    );

    // Ticket médio
    const ticket_medio = total_pedidos > 0 
      ? faturamento_total / total_pedidos
      : 0;

    // Clientes únicos
    const clientes_unicos = clientes.length;

    // Últimos 30 dias
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);

    const novos_clientes_30dias = clientes.filter(c => {
  const d = new Date(c.updated_at || 0);
  return d >= limite;
}).length;

    const clientes_recorrentes = clientes.filter(c => (c.qtd_pedidos || 0) > 1).length;

    return NextResponse.json({
      faturamento_total,
      ticket_medio,
      total_pedidos,
      clientes_unicos,
      novos_clientes_30dias,
      clientes_recorrentes
    });

  } catch (err: any) {
    return NextResponse.json(
      { erro: err.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}