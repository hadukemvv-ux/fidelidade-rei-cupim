import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// /api/admin/garcons/logs?id=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do garçom não informado." },
        { status: 400 }
      );
    }

    // Buscar logs completos do garçom
    const { data: logs, error } = await supabaseAdmin
      .from("garcons_logs")
      .select("*")
      .eq("garcom_id", id)     // <<<<<< CORREÇÃO AQUI
      .order("criado_em", { ascending: false });

    if (error) throw error;

    return NextResponse.json(logs || []);
  } catch (e: any) {
    console.error("Erro ao buscar logs:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}