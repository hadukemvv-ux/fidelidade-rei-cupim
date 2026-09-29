import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bloquearSeContencaoAtiva } from "@/lib/operationalContainment";
import { deliveryLedgerEnabled } from "@/lib/prizeDeliveryLedger";

export const dynamic = "force-dynamic";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const tokenIsValid = (token: string | null): token is string => Boolean(token && /^[A-Za-z0-9_-]{32,128}$/.test(token));

/** Consulta pública mínima de um QR V2: nunca retorna valor, mesa ou dados de operação. */
export async function GET(request: NextRequest) {
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;
  const token = new URL(request.url).searchParams.get("token");
  if (!tokenIsValid(token)) return NextResponse.json({ error: "QR inválido." }, { status: 400 });

  const { data: config, error: configError } = await supabaseAdmin
    .from("roleta_configuracoes")
    .select("v2_publicada")
    .eq("id", 1)
    .maybeSingle();
  if (configError || !config) return NextResponse.json({ error: "Não foi possível preparar a roleta." }, { status: 500 });
  if (!config.v2_publicada) return NextResponse.json({ error: "A Roleta V2 ainda não está disponível." }, { status: 409 });

  const { data: sessao, error } = await supabaseAdmin
    .from("roleta_sessoes")
    .select("id, status, nivel, expira_em")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível ler este QR." }, { status: 500 });
  if (!sessao) return NextResponse.json({ error: "QR não encontrado." }, { status: 404 });

  if (new Date(sessao.expira_em).getTime() <= Date.now()) {
    await supabaseAdmin.from("roleta_sessoes").update({ status: "expirada" }).eq("id", sessao.id).in("status", ["criada", "aberta"]);
    return NextResponse.json({ error: "Este QR expirou. Peça um novo à equipe." }, { status: 410 });
  }
  if (sessao.status === "girada") return NextResponse.json({ error: "Este QR já foi utilizado." }, { status: 409 });
  if (sessao.status === "expirada" || sessao.status === "cancelada") return NextResponse.json({ error: "Este QR não está disponível." }, { status: 410 });

  if (sessao.status === "criada") {
    await supabaseAdmin
      .from("roleta_sessoes")
      .update({ status: "aberta", aberta_em: new Date().toISOString() })
      .eq("id", sessao.id)
      .eq("status", "criada");
  }

  let elegiveis: { nome: string; emoji: string | null; imagem_url: string | null }[];
  // A função marca a presença da migração; o gate de entregas não decide o que
  // a roda exibe. Se o cache da API ainda não a conhece, não mostrar físico.
  const { data: filteredPrizes, error: eligibleError } = await supabaseAdmin.rpc("listar_premios_elegiveis_v2", { p_sessao_id: sessao.id });
  if (!eligibleError && Array.isArray(filteredPrizes)) {
    elegiveis = filteredPrizes as { nome: string; emoji: string | null; imagem_url: string | null }[];
  } else if (eligibleError?.code === "PGRST202" && !deliveryLedgerEnabled(process.env)) {
    // Migração ainda não aplicada (ou cache ainda não atualizado). O piloto
    // antigo segue acessível, mas sem prometer prêmio físico inelegível.
    const { data: premios, error: premiosError } = await supabaseAdmin
      .from("premios_roleta")
      .select("nome, emoji, tipo, pesos_nivel")
      .eq("versao", 2)
      .eq("ativo", true)
      .eq("participa_roleta", true);
    if (premiosError) return NextResponse.json({ error: "Não foi possível preparar os prêmios." }, { status: 500 });
    const indiceNivel = Number(sessao.nivel) - 1;
    const sorteaveis = (premios || []).filter((premio) => Number(premio.pesos_nivel?.[indiceNivel] || 0) > 0);
    // Sem a função do banco não há como garantir que a lista mostrada seja a
    // mesma do sorteio quando há prêmio físico ativo. Falhar fechado.
    if (sorteaveis.some((premio) => ["saideira", "expulsadeira", "sobremesa"].includes(premio.tipo))) {
      return NextResponse.json({ error: "Não foi possível preparar os prêmios." }, { status: 503 });
    }
    elegiveis = sorteaveis
      .map(({ nome, emoji }) => ({ nome, emoji, imagem_url: null }));
  } else {
    return NextResponse.json({ error: "Não foi possível preparar os prêmios." }, { status: 503 });
  }
  if (!elegiveis.length) return NextResponse.json({ error: "Não há prêmio disponível para esta faixa. Peça ajuda à equipe." }, { status: 409 });

  return NextResponse.json({
    nivel: sessao.nivel,
    expira_em: sessao.expira_em,
    premios: elegiveis.map(({ nome, emoji, imagem_url }) => ({ nome, emoji, imagem_url })),
  });
}
