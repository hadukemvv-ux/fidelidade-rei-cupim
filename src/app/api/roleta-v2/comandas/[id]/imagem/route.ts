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

  const { data: comanda, error } = await supabaseAdmin
    .from("comandas_roleta")
    .select("imagem_path")
    .eq("id", id).is("apagada_em", null).maybeSingle();
  if (error || !comanda) return NextResponse.json({ error: "Comanda não encontrada." }, { status: 404 });
  const { data, error: urlError } = await supabaseAdmin.storage.from("comandas-roleta").createSignedUrl(comanda.imagem_path, 60);
  if (urlError || !data?.signedUrl) return NextResponse.json({ error: "Não foi possível abrir a foto privada." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, expira_em: new Date(Date.now() + 60_000).toISOString() });
}
