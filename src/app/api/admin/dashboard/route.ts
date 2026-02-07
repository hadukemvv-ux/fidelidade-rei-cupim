import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Total de Clientes
    const { count: totalClientes } = await supabase
      .from('base_clientes_saipos')
      .select('*', { count: 'exact', head: true });

    // Pontos Distribuídos
    const { data: entradas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'entrada');

    const pontosDistribuidos =
      entradas?.reduce((s, e) => s + e.valor, 0) || 0;

    // Pontos Resgatados
    const { data: saidas } = await supabase
      .from('extrato_pontos')
      .select('valor')
      .eq('tipo', 'saida');

    const pontosResgatados =
      saidas?.reduce((s, e) => s + e.valor, 0) || 0;

    // Total de Resgates
    const { count: totalResgates } = await supabase
      .from('resgates')
      .select('*', { count: 'exact', head: true });

    // Cashback
    const { data: cashbackData } = await supabase
      .from('resgates')
      .select('valor')
      .eq('tipo', 'cashback');

    const cashbackDistribuido =
      cashbackData?.reduce((s, e) => s + e.valor, 0) || 0;

    return NextResponse.json({
      ok: true,
      totalClientes: totalClientes || 0,
      pontosDistribuidos,
      pontosResgatados,
      totalResgates: totalResgates || 0,
      cashbackDistribuido
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}