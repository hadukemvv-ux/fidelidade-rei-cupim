import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { updatePrize } from '@/lib/prizeUpdate';
import {
  successResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const actor = await requireOperationalActor(request, 'gestor');
  if (actor instanceof Response) return actor;

  try {
    logInfo('/api/admin/premios', 'Listando premios da roleta', { requestId });

    const { data, error } = await supabaseAdmin
      .from('premios_roleta')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      logError('/api/admin/premios', error as Error, { requestId });
      return handleApiError(error, '/api/admin/premios', requestId);
    }

    const { data: configuracao, error: configError } = await supabaseAdmin
      .from('roleta_configuracoes')
      .select('v2_publicada, v2_modo_teste')
      .eq('id', 1)
      .maybeSingle();
    if (configError) return handleApiError(configError, '/api/admin/premios', requestId);

    return successResponse({ premios: data || [], configuracao });
  } catch (error) {
    logError('/api/admin/premios', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/premios', requestId);
  }
}

export async function PUT(request: NextRequest) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) return actor;
  return updatePrize(request, actor, {
    async commit({ prizeId, actorId, changes }) {
      const { data, error } = await supabaseAdmin.rpc('atualizar_premio_roleta', {
        p_premio_id: prizeId, p_actor_id: actorId, p_alteracoes: changes,
      });
      if (error || !data) {
        // Só código e mensagem do banco (sem o corpo enviado), para o motivo aparecer nos logs da Vercel.
        console.error('atualizar_premio_roleta falhou', error?.code, error?.message);
        throw new Error('Falha ao confirmar edição do prêmio.');
      }
      return data;
    },
  });
}
