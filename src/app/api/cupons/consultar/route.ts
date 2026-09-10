import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireOperationalActor } from "@/lib/operationalAuth";

export const dynamic = "force-dynamic";

const codeHash = (code: string) => crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

export async function POST(request: Request) {
  const actor = await requireOperationalActor(request, "caixa");
  if (actor instanceof NextResponse) return actor;

  const { codigo } = await request.json().catch(() => ({}));
  if (typeof codigo !== "string" || codigo.trim().length < 6) {
    return NextResponse.json({ error: "Informe um código de cupom válido." }, { status: 400 });
  }

  const { data: cupom, error } = await supabaseAdmin
    .from("cupons_promocionais")
    .select("id, codigo_final, tipo_premio, canal_uso, status, modo_teste, expira_em, valor_desconto_percentual, teto_desconto, pedido_minimo")
    .eq("codigo_hash", codeHash(codigo))
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Não foi possível consultar o cupom." }, { status: 500 });
  if (!cupom) return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });

  await supabaseAdmin.from("cupom_eventos").insert({
    cupom_id: cupom.id, acao: "consultado", actor_user_id: actor.userId, actor_nome: actor.nome,
    actor_email: actor.email, actor_papel: actor.papel, origem: "caixa",
  });

  return NextResponse.json({ cupom });
}
