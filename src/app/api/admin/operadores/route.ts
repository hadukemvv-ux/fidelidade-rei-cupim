import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAdminAuth } from "@/app/api/_utils/validateAdminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const OperatorSchema = z.object({
  user_id: z.string().uuid(),
  nome: z.string().trim().min(3).max(120),
  papel: z.enum(["superadmin", "gestor", "caixa"]),
  ativo: z.boolean(),
});

async function actorFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

export async function GET(request: Request) {
  const denied = await validateAdminAuth(request, new URL(request.url));
  if (denied) return denied;

  const [{ data: profiles, error: profileError }, { data: authData, error: authError }] = await Promise.all([
    supabaseAdmin.from("perfis_operacionais").select("user_id, nome, email, papel, ativo, criado_em, atualizado_em").order("nome"),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profileError || authError) return NextResponse.json({ error: "Não foi possível carregar os acessos." }, { status: 500 });

  const users = new Map((authData.users || []).map((user) => [user.id, { email: user.email || "", criado_em: user.created_at }]));
  const operadores = (profiles || []).map((profile) => ({ ...profile, conta_encontrada: users.has(profile.user_id), conta_criada_em: users.get(profile.user_id)?.criado_em || null }));
  const semPerfil = [...users.entries()]
    .filter(([id]) => !(profiles || []).some((profile) => profile.user_id === id))
    .map(([user_id, user]) => ({ user_id, email: user.email, conta_criada_em: user.criado_em }));

  return NextResponse.json({ operadores, semPerfil });
}

export async function PUT(request: Request) {
  const denied = await validateAdminAuth(request, new URL(request.url));
  if (denied) return denied;

  const parsed = OperatorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados de acesso inválidos." }, { status: 400 });

  const { user_id, nome, papel, ativo } = parsed.data;
  const { data: authLookup } = await supabaseAdmin.auth.admin.getUserById(user_id);
  const email = authLookup.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "A conta escolhida não existe mais." }, { status: 404 });

  const { data: previous } = await supabaseAdmin.from("perfis_operacionais").select("nome, papel, ativo").eq("user_id", user_id).maybeSingle();
  const { error } = await supabaseAdmin.from("perfis_operacionais").upsert({ user_id, nome, email, papel, ativo, atualizado_em: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Não foi possível salvar o acesso." }, { status: 500 });

  const actor = await actorFromRequest(request);
  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "operador", entidade_id: user_id, acao: previous ? "acesso_atualizado" : "acesso_liberado",
    actor_user_id: actor?.id || null, actor_email: actor?.email || null,
    detalhes: { antes: previous, depois: { nome, papel, ativo, email } },
  });

  return NextResponse.json({ ok: true });
}
