import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { getFaixaRoletaV2 } from "@/lib/roleta-v2-rules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bloquearSeContencaoAtiva } from "@/lib/operationalContainment";

const Body = z.object({
  data_operacional: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horario_abertura: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  id_pedido_impresso: z.string().regex(/^\d{4,30}$/),
  valor_confirmado: z.coerce.number().finite().min(0).max(100000),
  confirmou_comanda: z.literal(true),
});
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Emite QR de piloto uma única vez depois da dupla conferência do garçom. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;
  const actor = await requireOperationalActor(request, "garcom", ["garcom", "gestor", "superadmin"]);
  if (actor instanceof NextResponse) return actor;
  const body = Body.safeParse(await request.json().catch(() => null));
  const { id } = await params;
  if (!body.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Dados de confirmação inválidos." }, { status: 400 });

  const { data: config, error: configError } = await supabaseAdmin
    .from("roleta_configuracoes").select("v2_publicada, qr_expira_minutos, v2_modo_teste").eq("id", 1).maybeSingle();
  if (configError || !config) return NextResponse.json({ error: "Não foi possível carregar a configuração da roleta." }, { status: 500 });
  if (!config.v2_publicada) return NextResponse.json({ error: "A Roleta V2 de teste ainda não foi liberada pela administração." }, { status: 409 });
  if (!config.v2_modo_teste) return NextResponse.json({ error: "Este fluxo está autorizado somente enquanto a Roleta estiver em modo de teste." }, { status: 409 });

  const faixa = getFaixaRoletaV2(body.data.valor_confirmado);
  const token = crypto.randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + Number(config.qr_expira_minutos) * 60_000).toISOString();
  const { data, error } = await supabaseAdmin.rpc("liberar_roleta_por_comanda", {
    p_comanda_id: id, p_actor_user_id: actor.userId, p_actor_nome: actor.nome, p_actor_email: actor.email,
    p_data_operacional: body.data.data_operacional, p_horario_abertura: `${body.data.horario_abertura}:00`, p_id_pedido_impresso: body.data.id_pedido_impresso,
    p_valor_confirmado: body.data.valor_confirmado, p_nivel_roleta: faixa.nivel,
    p_token_hash: hash(token), p_expira_em: expiraEm,
  });
  if (error) return NextResponse.json({ error: "Não foi possível registrar a liberação da comanda." }, { status: 500 });
  if (!data?.ok) return NextResponse.json({ error: data?.motivo || "QR não pôde ser liberado." }, { status: 409 });
  return NextResponse.json({ token, expira_em: expiraEm, nivel: faixa.nivel, faixa: faixa.nome, modo_teste: true });
}
