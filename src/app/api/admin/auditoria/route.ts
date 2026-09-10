import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/app/api/_utils/validateAdminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await validateAdminAuth(request, new URL(request.url));
  if (denied) return denied;
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") || 100), 1), 300);
  const [{ data: adminEvents, error: adminError }, { data: cupomEvents, error: couponError }] = await Promise.all([
    supabaseAdmin.from("administracao_eventos").select("id, entidade, entidade_id, acao, actor_email, detalhes, criado_em").order("criado_em", { ascending: false }).limit(limit),
    supabaseAdmin.from("cupom_eventos").select("id, cupom_id, acao, actor_email, actor_papel, origem, motivo, criado_em").order("criado_em", { ascending: false }).limit(limit),
  ]);
  if (adminError || couponError) return NextResponse.json({ error: "Não foi possível carregar a auditoria." }, { status: 500 });
  const eventos = [
    ...(adminEvents || []).map((event) => ({ ...event, fonte: "admin" })),
    ...(cupomEvents || []).map((event) => ({ ...event, entidade: "cupom", entidade_id: event.cupom_id, fonte: "cupom" })),
  ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).slice(0, limit);
  return NextResponse.json({ eventos });
}
