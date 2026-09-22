import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytesPerImage = 1_400_000;

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
    .select("id, status, mesa_referencia, id_pedido_impresso, valor_confirmado, saipos_sale_id, reconciliacao_status, reconciliada_em, reconciliacao_detalhes, criado_por_nome, criado_em, revisada_por_nome, revisada_em, motivo_revisao, expira_em")
    .is("apagada_em", null)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Não foi possível carregar as comandas." }, { status: 500 });
  return NextResponse.json({ comandas: data || [] });
}

function arquivoValido(file: FormDataEntryValue | null): file is File {
  return file instanceof File && allowed.has(file.type) && file.size > 0 && file.size <= maxBytesPerImage;
}

async function guardarImagem(image: File, tipo: "cabecalho" | "total") {
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${tipo}.${extension}`;
  const bytes = Buffer.from(await image.arrayBuffer());
  if (!imagemCorrespondeAoTipo(bytes, image.type)) throw new Error("O conteúdo de uma das fotos não corresponde a uma imagem válida.");
  const { error } = await supabaseAdmin.storage.from("comandas-roleta").upload(path, bytes, {
    contentType: image.type, upsert: false, cacheControl: "private, max-age=0",
  });
  if (error) throw new Error("Não foi possível guardar uma das fotos da comanda.");
  return path;
}

/** Recebe duas fotos complementares. Elas ficam privadas e não geram QR automaticamente. */
export async function POST(request: Request) {
  // A gestão é apenas consulta. Somente o garçom responsável ou o superadmin
  // podem registrar a evidência operacional.
  const actor = await requireOperationalActor(request, "garcom", ["garcom", "superadmin"]);
  if (actor instanceof NextResponse) return actor;

  const form = await request.formData().catch(() => null);
  const cabecalho = form?.get("foto_cabecalho") || null; const total = form?.get("foto_total") || null;
  const mesa = String(form?.get("mesa_referencia") || "").trim();
  if (!arquivoValido(cabecalho) || !arquivoValido(total)) {
    return NextResponse.json({ error: "Envie as duas fotos em JPEG, PNG ou WebP, com até 1,4 MB cada." }, { status: 400 });
  }
  if (!referenciaValida(mesa)) return NextResponse.json({ error: "Informe uma mesa ou referência válida." }, { status: 400 });

  const paths: string[] = [];
  try { paths.push(await guardarImagem(cabecalho, "cabecalho"), await guardarImagem(total, "total")); }
  catch (cause) { if (paths.length) await supabaseAdmin.storage.from("comandas-roleta").remove(paths); return NextResponse.json({ error: cause instanceof Error ? cause.message : "Não foi possível guardar as fotos." }, { status: 500 }); }

  const { data, error } = await supabaseAdmin.from("comandas_roleta").insert({ imagem_path: paths[0], mesa_referencia: mesa, criado_por: actor.userId, criado_por_nome: actor.nome }).select("id, status, mesa_referencia, criado_em").single();
  if (error) { await supabaseAdmin.storage.from("comandas-roleta").remove(paths); return NextResponse.json({ error: "Não foi possível registrar a comanda." }, { status: 500 }); }
  const { error: imagesError } = await supabaseAdmin.from("comanda_imagens").insert([
    { comanda_id: data.id, tipo: "cabecalho", imagem_path: paths[0] }, { comanda_id: data.id, tipo: "total", imagem_path: paths[1] },
  ]);
  if (imagesError) { await supabaseAdmin.from("comandas_roleta").delete().eq("id", data.id); await supabaseAdmin.storage.from("comandas-roleta").remove(paths); return NextResponse.json({ error: "Não foi possível vincular as fotos à comanda." }, { status: 500 }); }
  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "comanda", entidade_id: data.id, acao: "foto_enviada",
    actor_user_id: actor.userId, actor_email: actor.email,
    detalhes: { mesa_referencia: mesa, imagens_privadas: 2, expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
  });
  return NextResponse.json({ comanda: data }, { status: 201 });
}
