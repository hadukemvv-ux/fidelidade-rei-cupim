import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Entrega uma URL privada e efêmera somente à gestão para conferir a foto. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOperationalActor(request, "gestor");
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Comanda inválida." }, { status: 400 });

  const { data: comanda, error } = await supabaseAdmin.from("comandas_roleta")
    .select("id").eq("id", id).is("apagada_em", null).maybeSingle();
  if (error || !comanda) return NextResponse.json({ error: "Comanda não encontrada." }, { status: 404 });
  const { data: imagens, error: imageError } = await supabaseAdmin.from("comanda_imagens")
    .select("tipo, imagem_path").eq("comanda_id", id).order("tipo");
  if (imageError || !imagens || imagens.length !== 2) return NextResponse.json({ error: "As duas fotos privadas não estão disponíveis." }, { status: 404 });
  const urls = await Promise.all(imagens.map(async (imagem) => {
    const { data, error: urlError } = await supabaseAdmin.storage.from("comandas-roleta").createSignedUrl(imagem.imagem_path, 60);
    if (urlError || !data?.signedUrl) throw new Error("url");
    return { tipo: imagem.tipo, url: data.signedUrl };
  })).catch(() => null);
  if (!urls) return NextResponse.json({ error: "Não foi possível abrir as fotos privadas." }, { status: 500 });
  return NextResponse.json({ imagens: urls, expira_em: new Date(Date.now() + 60_000).toISOString() });
}
