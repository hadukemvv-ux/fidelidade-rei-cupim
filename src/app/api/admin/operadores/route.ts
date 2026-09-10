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

const InviteSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(255),
  papel: z.enum(["gestor", "caixa"]),
});

const DeleteSchema = z.object({
  user_id: z.string().uuid(),
  confirmar: z.literal(true),
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

/** Cria uma conta por convite: o funcionário escolhe a própria senha pelo e-mail. */
export async function POST(request: Request) {
  const denied = await validateAdminAuth(request, new URL(request.url));
  if (denied) return denied;

  const parsed = InviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe nome, e-mail e função válidos." }, { status: 400 });
  const { nome, papel } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { nome }, redirectTo: new URL("/login", request.url).toString(),
  });
  if (inviteError || !invite.user) {
    return NextResponse.json({ error: inviteError?.message || "Não foi possível enviar o convite." }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from("perfis_operacionais").upsert({
    user_id: invite.user.id, nome, email, papel, ativo: true, atualizado_em: new Date().toISOString(),
  });
  if (profileError) return NextResponse.json({ error: "Convite enviado, mas a permissão não pôde ser salva." }, { status: 500 });

  const actor = await actorFromRequest(request);
  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "operador", entidade_id: invite.user.id, acao: "convite_enviado",
    actor_user_id: actor?.id || null, actor_email: actor?.email || null,
    detalhes: { nome, email, papel },
  });
  return NextResponse.json({ ok: true, message: `Convite enviado para ${email}.` }, { status: 201 });
}

/** Exclui somente acessos operacionais de teste; a auditoria permanece preservada. */
export async function DELETE(request: Request) {
  const denied = await validateAdminAuth(request, new URL(request.url));
  if (denied) return denied;

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirmação de exclusão inválida." }, { status: 400 });

  const { user_id } = parsed.data;
  const actor = await actorFromRequest(request);
  if (actor?.id === user_id) return NextResponse.json({ error: "Não é permitido excluir o próprio acesso." }, { status: 400 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("perfis_operacionais")
    .select("nome, email, papel")
    .eq("user_id", user_id)
    .maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Esta conta não é um acesso operacional gerenciado." }, { status: 404 });
  if (profile.papel === "superadmin") return NextResponse.json({ error: "A administração total não pode ser excluída por esta tela." }, { status: 400 });

  const { data: authLookup } = await supabaseAdmin.auth.admin.getUserById(user_id);
  if (!authLookup.user) return NextResponse.json({ error: "A conta escolhida não existe mais." }, { status: 404 });

  await supabaseAdmin.from("administracao_eventos").insert({
    entidade: "operador", entidade_id: user_id, acao: "usuario_excluido_para_teste",
    actor_user_id: actor?.id || null, actor_email: actor?.email || null,
    detalhes: { nome: profile.nome, email: profile.email, papel: profile.papel, motivo: "exclusao_confirmada_no_painel", auditoria_preservada: true },
  });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: "Não foi possível excluir o acesso." }, { status: 500 });
  return NextResponse.json({ ok: true, message: `Acesso de ${profile.email} excluído; o registro de auditoria foi preservado.` });
}
