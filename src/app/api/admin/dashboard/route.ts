import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {

    // TOTAL DE CLIENTES
    const { count: totalClientes } = await supabaseAdmin
      .from("base_clientes_saipos")
      .select("*", { count: "exact", head: true });

    // PONTOS DISTRIBUÍDOS
    const { data: extratos } = await supabaseAdmin
      .from("extrato_pontos")
      .select("valor")
      .eq("tipo", "entrada");

    const pontosDistribuidos = extratos?.reduce((a, b) => a + b.valor, 0) || 0;

    // PRÊMIOS ENTREGUES
    const { count: premiosEntregues } = await supabaseAdmin
      .from("historico_roleta")
      .select("*", { count: "exact", head: true });

    // GIROS DA ROLETA
    const { count: girosRoleta } = await supabaseAdmin
      .from("historico_roleta")
      .select("*", { count: "exact", head: true });

    // SALDO MÉDIO DE PONTOS
    const { data: clientes } = await supabaseAdmin
      .from("base_clientes_saipos")
      .select("pontos");

    const saldoMedioClientes =
      (clientes?.reduce((a, b) => a + (b.pontos || 0), 0) || 0) /
      (clientes?.length || 1);

    return NextResponse.json({
      totalClientes,
      pontosDistribuidos,
      premiosEntregues,
      girosRoleta,
      saldoMedioClientes,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}