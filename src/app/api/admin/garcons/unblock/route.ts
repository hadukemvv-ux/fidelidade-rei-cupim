import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { garcom_id, motivo } = body;

    if (!garcom_id) {
      return NextResponse.json(
        { error: "ID do garçom não informado." },
        { status: 400 }
      );
    }

    // 1. Registrar no LOG que houve desbloqueio
    await supabaseAdmin.from("garcons_logs").insert({
      garcom_id,
      premio: "DESBLOQUEIO",
      telefone_cliente: null,
      ip: "painel-admin",
      user_agent: "painel-admin",
      score: 0,
      suspeito: false,
      motivo: motivo || "Desbloqueado manualmente pelo administrador",
    });

    return NextResponse.json({
      ok: true,
      mensagem: "Garçom desbloqueado com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro ao desbloquear garçom:", err);
    return NextResponse.json(
      { error: "Erro interno ao desbloquear." },
      { status: 500 }
    );
  }
}