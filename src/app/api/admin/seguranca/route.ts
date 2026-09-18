import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ActionSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("ativar_contencao"),
    confirmar: z.literal("CONTER"),
    severidade: z.enum(["suspeita", "baixo", "moderado", "alto", "critico"]),
    descricao: z.string().trim().min(10).max(2000),
    escopo: z.string().trim().max(2000).optional(),
  }),
  z.object({
    acao: z.literal("desativar_contencao"),
    confirmar: z.literal("REABRIR"),
    incidente_id: z.string().uuid(),
    motivo: z.string().trim().min(10).max(2000),
  }),
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await requireOperationalActor(request, "gestor");
  if (actor instanceof Response) return actor;

  const [{ data: configuracao, error: configError }, { data: incidentes, error: incidentError }] = await Promise.all([
    supabaseAdmin.from("seguranca_configuracoes").select("modo_contencao, incidente_atual_id, atualizado_em, atualizado_por").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("incidentes_seguranca").select("id, status, severidade, descricao, escopo, iniciado_por_email, iniciado_em, contencao_desativada_em").order("iniciado_em", { ascending: false }).limit(10),
  ]);
  if (configError || incidentError || !configuracao) {
    return NextResponse.json({ error: "Não foi possível carregar a central de segurança." }, { status: 500 });
  }

  return NextResponse.json({ configuracao, incidentes: incidentes || [] });
}

export async function POST(request: Request) {
  const actor = await requireOperationalActor(request, "superadmin");
  if (actor instanceof Response) return actor;

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirmação ou dados do incidente inválidos." }, { status: 400 });

  if (parsed.data.acao === "ativar_contencao") {
    const { data, error } = await supabaseAdmin.rpc("iniciar_contencao_incidente", {
      p_actor_user_id: actor.userId,
      p_actor_email: actor.email,
      p_severidade: parsed.data.severidade,
      p_descricao: parsed.data.descricao,
      p_escopo: parsed.data.escopo || null,
    });
    if (error) return NextResponse.json({ error: "Não foi possível ativar a contenção." }, { status: 500 });
    return NextResponse.json({ ok: true, resultado: data });
  }

  const { data, error } = await supabaseAdmin.rpc("desativar_contencao_incidente", {
    p_incidente_id: parsed.data.incidente_id,
    p_actor_user_id: actor.userId,
    p_actor_email: actor.email,
    p_motivo: parsed.data.motivo,
  });
  if (error) return NextResponse.json({ error: "Não foi possível reabrir o Clube." }, { status: 500 });
  return NextResponse.json({ ok: true, resultado: data });
}
