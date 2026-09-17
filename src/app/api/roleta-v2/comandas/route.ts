import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

function imagemCorrespondeAoTipo(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return type === "image/webp" && bytes.length >= 12 && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
}

function referenciaValida(mesa: string) {
  return mesa.length >= 1 && mesa.length <= 80 && /^[a-zA-Z0-9À-ÿ #/_.-]+$/.test(mesa);
}

/** Lista somente metadados para a fila da gestão; fotos usam rota temporária separada. */
export async function GET(request: Request) {
  const actor = await requireOperationalActor(request, "gestor");
  if (actor instanceof NextResponse) return actor;

  const { data, error } = await supabaseAdmin
    .from("comandas_roleta")
    .select("id, status, mesa_referencia, valor_informado, saipos_sale_id, criado_por_nome, criado_em, revisada_por_nome, revisada_em, motivo_revisao, expira_em")
    .is("apagada_em", null)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Não foi possível carregar as comandas." }, { status: 500 });
  return NextResponse.json({ comandas: data || [] });
}

/** Recebe uma foto da comanda. Ela fica privada e não gera QR automaticamente. */
export async function POST(request: Request) {
  const actor = await requireOperationalActor(request, "garcom");
  if (actor instanceof NextResponse) return actor;

  const form = await request.formData().catch(() => null);
  const image = form?.get("imagem"); const mesa = String(form?.get("mesa_referencia") || "").trim();
  if (!(image instanceof File) || !allowed.has(image.type) || image.size === 0 || image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Envie uma foto JPEG, PNG ou WebP de até 5 MB." }, { status: 400 });
  }
  if (!referenciaValida(mesa)) return NextResponse.json({ error: "Informe uma mesa ou referência válida." }, { status: 400 });

  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await image.arrayBuffer());
  if (!imagemCorrespondeAoTipo(bytes, image.type)) {
    return NextResponse.json({ error: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
  }
  const { error: uploadError } = await supabaseAdmin.storage.from("comandas-roleta").upload(path, bytes, {
    contentType: image.type, upsert: false, cacheControl: "private, max-age=0",
  });
  if (uploadError) return NextResponse.json({ error: "Não foi possível guardar a foto da comanda." }, { status: 500 });

  const { data, error } = await supabaseAdmin.from("comandas_roleta").insert({ imagem_path: path, mesa_referencia: mesa, criado_por: actor.userId, criado_por_nome: actor.nome }).select("id, status, mesa_referencia, criado_em").single();
  if (error) { await supabaseAdmin.storage.from("comandas-roleta").remove([path]); return NextResponse.json({ error: "Não foi possível registrar a comanda." }, { status: 500 }); }
  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "comanda", entidade_id: data.id, acao: "foto_enviada",
    actor_user_id: actor.userId, actor_email: actor.email,
    detalhes: { mesa_referencia: mesa, imagem_privada: true, expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
  });
  return NextResponse.json({ comanda: data }, { status: 201 });
}
