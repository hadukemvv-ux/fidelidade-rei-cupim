import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const Body = z.object({
  acao: z.enum(["em_analise", "rejeitada"]),
  motivo: z.string().trim().min(3).max(500),
});

/** A gestão pode registrar análise ou rejeição; esta etapa nunca cria QR ou prêmio. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOperationalActor(request, "gestor");
  if (actor instanceof NextResponse) return actor;
  const body = Body.safeParse(await request.json().catch(() => null)); const { id } = await params;
  if (!body.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Dados da revisão inválidos." }, { status: 400 });
  const { data: comanda } = await supabaseAdmin.from("comandas_roleta").select("id, status").eq("id", id).is("apagada_em", null).maybeSingle();
  if (!comanda || !["enviada", "em_analise"].includes(comanda.status)) return NextResponse.json({ error: "Esta comanda não está disponível para revisão." }, { status: 409 });
  const { error: reviewError } = await supabaseAdmin.from("comandas_roleta").update({
    status: body.data.acao, motivo_revisao: body.data.motivo,
    revisada_por: actor.userId, revisada_por_nome: actor.nome, revisada_em: new Date().toISOString(),
  }).eq("id", id).in("status", ["enviada", "em_analise"]);
  if (reviewError) return NextResponse.json({ error: "Não foi possível registrar a revisão." }, { status: 500 });
  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "comanda", entidade_id: id, acao: `revisao_${body.data.acao}`,
    actor_user_id: actor.userId, actor_email: actor.email, detalhes: { gera_qr: false },
  });
  return NextResponse.json({ ok: true, mensagem: "Revisão registrada. Nenhum QR ou prêmio foi liberado." });
}
