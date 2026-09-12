import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { getFaixaRoletaV2 } from "@/lib/roleta-v2-rules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  valor_comanda: z.coerce.number().finite().min(0).max(100000),
  mesa_referencia: z.string().trim().min(1).max(80).optional(),
});

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Cria um QR de uso único. O token retornado é opaco e expira em minutos. */
export async function POST(request: Request) {
  // Enquanto não existe confirmação automática da Saipos, gerar QR manual é
  // uma exceção de piloto aprovada por gestor. Caixa continua somente validando
  // cupons; isso reduz o risco de premiação por valor ou nível inventados.
  const actor = await requireOperationalActor(request, "gestor");
  if (actor instanceof NextResponse) return actor;

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe valor da comanda e mesa válidos." }, { status: 400 });

  const faixa = getFaixaRoletaV2(parsed.data.valor_comanda);

  const { data: config, error: configError } = await supabaseAdmin
    .from("roleta_configuracoes")
    .select("v2_publicada, qr_expira_minutos")
    .eq("id", 1)
    .maybeSingle();
  if (configError || !config) return NextResponse.json({ error: "Não foi possível carregar a configuração da roleta." }, { status: 500 });
  if (!config.v2_publicada) return NextResponse.json({ error: "A Roleta V2 ainda não foi liberada para operação." }, { status: 409 });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + Number(config.qr_expira_minutos) * 60_000).toISOString();
  const { error } = await supabaseAdmin.from("roleta_sessoes").insert({
    token_hash: hashToken(token), ...parsed.data, nivel: faixa.nivel, criado_por: actor.userId,
    criado_por_nome: actor.nome, expira_em: expiraEm,
  });
  if (error) return NextResponse.json({ error: "Não foi possível criar o QR temporário." }, { status: 500 });

  return NextResponse.json({ token, expira_em: expiraEm, nivel: faixa.nivel, faixa: faixa.nome });
}
