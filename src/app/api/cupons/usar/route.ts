import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireOperationalActor } from "@/lib/operationalAuth";

export const dynamic = "force-dynamic";

const codeHash = (code: string) => crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
const getIpHash = (request: Request) => crypto.createHash("sha256")
  .update(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown")
  .digest("hex");

export async function POST(request: Request) {
  const actor = await requireOperationalActor(request, "caixa");
  if (actor instanceof NextResponse) return actor;

  const { codigo } = await request.json().catch(() => ({}));
  if (typeof codigo !== "string" || codigo.trim().length < 6) {
    return NextResponse.json({ error: "Informe um código de cupom válido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("usar_cupom_promocional", {
    p_codigo_hash: codeHash(codigo), p_actor_user_id: actor.userId, p_actor_nome: actor.nome,
    p_actor_email: actor.email, p_actor_papel: actor.papel, p_origem: "caixa",
    p_request_id: crypto.randomUUID(), p_ip_hash: getIpHash(request),
  });

  if (error) return NextResponse.json({ error: "Não foi possível validar o cupom agora." }, { status: 500 });
  return NextResponse.json(data, { status: data?.ok ? 200 : 409 });
}
