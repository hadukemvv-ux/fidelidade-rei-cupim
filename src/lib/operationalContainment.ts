import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Retorna uma resposta de indisponibilidade quando o superadmin ativou a
 * contenção. Falhas ao consultar o estado também fecham operações públicas:
 * em um incidente, é preferível interromper um benefício a expor dados.
 */
export async function bloquearSeContencaoAtiva() {
  const { data, error } = await supabaseAdmin
    .from("seguranca_configuracoes")
    .select("modo_contencao")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "O Clube está temporariamente indisponível para verificação de segurança." },
      { status: 503 },
    );
  }

  if (data.modo_contencao) {
    return NextResponse.json(
      { error: "O Clube está temporariamente pausado para uma verificação de segurança. Tente novamente mais tarde." },
      { status: 503 },
    );
  }

  return null;
}
