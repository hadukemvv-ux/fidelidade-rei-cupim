import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { periodo } = await req.json(); 
    // periodo: "7d", "30d", "90d", "custom", {inicio, fim}

    const hoje = new Date();
    let inicio = new Date();

    if (periodo === "7d") inicio.setDate(hoje.getDate() - 7);
    if (periodo === "30d") inicio.setDate(hoje.getDate() - 30);
    if (periodo === "90d") inicio.setDate(hoje.getDate() - 90);

    // CUSTOM PERÍODO
    if (typeof periodo === "object" && periodo.inicio && periodo.fim) {
      inicio = new Date(periodo.inicio);
      hoje.setTime(new Date(periodo.fim).getTime());
    }

    const inicioISO = inicio.toISOString();
    const fimISO = hoje.toISOString();

    // ---------------------------
    // CLIENTES NO PERÍODO
    // ---------------------------
    const { data: clientesPeriodo } = await supabase
      .from('base_clientes_saipos')
      .select('id, atualizado_em')
      .gte('atualizado_em', inicioISO)
      .lte('atualizado_em', fimISO);

    // ---------------------------
    // PONTOS
    // ---------------------------
    const { data: pontosEntrada } = await supabase
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'entrada')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    const { data: pontosSaida } = await supabase
      .from('extrato_pontos')
      .select('valor, criado_em')
      .eq('tipo', 'saida')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    // ---------------------------
    // RESGATES
    // ---------------------------
    const { data: resgatesPeriodo } = await supabase
      .from('resgates')
      .select('id, criado_em, tipo, produto_id, premio_nome')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);

    // ---------------------------
    // ROLETA
    // ---------------------------
    const { data: giros } = await supabase
      .from('historico_roleta')
      .select('id, premio_nome, data_hora')
      .gte('data_hora', inicioISO)
      .lte('data_hora', fimISO);

    return NextResponse.json({
      ok: true,
      periodo: { inicio: inicioISO, fim: fimISO },
      clientesPeriodo,
      pontosEntrada,
      pontosSaida,
      resgatesPeriodo,
      giros
    });

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}