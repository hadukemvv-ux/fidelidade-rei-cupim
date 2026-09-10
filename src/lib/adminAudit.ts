import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function registrarAuditoriaAdmin(request: Request, entidade: 'operador' | 'garcom' | 'cupom' | 'feriado' | 'configuracao', entidadeId: string | number, acao: string, detalhes: Record<string, unknown> = {}) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const { data } = token ? await supabaseAdmin.auth.getUser(token) : { data: { user: null } };
    await supabaseAdmin.from('administracao_eventos').insert({
      entidade, entidade_id: String(entidadeId), acao, actor_user_id: data.user?.id || null,
      actor_email: data.user?.email || null, detalhes,
    });
  } catch {
    // A operação solicitada continua funcionando se a escrita da auditoria falhar temporariamente.
  }
}
