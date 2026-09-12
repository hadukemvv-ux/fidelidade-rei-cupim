import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/, "QR inválido."),
  telefone: z.string().min(8).max(40),
  receber_marketing: z.boolean().default(false),
  consentimento_versao: z.string().trim().min(1).max(100).optional(),
});

const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const createCouponCode = () => `CUPIM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

/** Gira uma única vez. A escolha de prêmio e o consumo da sessão acontecem juntos no banco. */
export async function POST(request: NextRequest) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um telefone e QR válidos." }, { status: 400 });

  const telefone = normalizePhone(parsed.data.telefone);
  if (!/^\d{10,11}$/.test(telefone)) return NextResponse.json({ error: "Informe um telefone brasileiro válido." }, { status: 400 });

  const { data: clientes, error: clienteError } = await supabaseAdmin
    .from("base_clientes_saipos")
    .select("id")
    .eq("telefone", telefone)
    .limit(1);
  if (clienteError) return NextResponse.json({ error: "Não foi possível preparar seu giro." }, { status: 500 });

  const couponCode = createCouponCode();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const random = crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
  const { data, error } = await supabaseAdmin.rpc("girar_roleta_v2", {
    p_token_hash: hash(parsed.data.token),
    p_telefone_hash: hash(telefone),
    p_cliente_id: clientes?.[0]?.id ?? null,
    p_consentimento_marketing: parsed.data.receber_marketing,
    p_consentimento_versao: parsed.data.consentimento_versao ?? "marketing-roleta-v1",
    p_origem_consentimento: "roleta_v2",
    p_ip_hash: hash(ip),
    p_aleatorio: random,
    p_codigo_hash: hash(couponCode),
    p_codigo_final: couponCode,
  });
  if (error) return NextResponse.json({ error: "Não foi possível concluir o giro agora." }, { status: 500 });
  if (!data?.ok) return NextResponse.json({ error: data?.motivo || "Não foi possível concluir o giro." }, { status: 409 });

  return NextResponse.json({
    premio: data.premio,
    cupom: couponCode,
    expira_em: data.expira_em,
    modo_teste: data.modo_teste,
  });
}
