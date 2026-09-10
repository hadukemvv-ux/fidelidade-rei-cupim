import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type OperationalRole = "superadmin" | "gestor" | "caixa";

export type OperationalActor = {
  userId: string;
  nome: string;
  email: string;
  papel: OperationalRole;
};

const roleRank: Record<OperationalRole, number> = {
  caixa: 1,
  gestor: 2,
  superadmin: 3,
};

export async function requireOperationalActor(
  request: Request,
  minimumRole: OperationalRole = "caixa",
): Promise<OperationalActor | NextResponse> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Faça login para acessar a validação de cupons." }, { status: 401 });
  }

  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("perfis_operacionais")
    .select("nome, email, papel, ativo")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.ativo) {
    return NextResponse.json({ error: "Seu acesso operacional ainda não foi liberado." }, { status: 403 });
  }

  const papel = profile.papel as OperationalRole;
  if (roleRank[papel] < roleRank[minimumRole]) {
    return NextResponse.json({ error: "Seu perfil não tem permissão para esta operação." }, { status: 403 });
  }

  return { userId: auth.user.id, nome: profile.nome, email: profile.email, papel };
}
