import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { errorResponse, getRequestId, handleApiError, logError, successResponse, validationErrorResponse } from '@/lib/api-utils';

const schema = z.object({ cliente_id: z.coerce.number().int().positive() });

async function alterarPiloto(clienteId: number, habilitar: boolean, actor: { userId: string; email: string }) {
  return supabaseAdmin.rpc('alterar_cliente_piloto_auditado', {
    p_cliente_id: clienteId,
    p_habilitar: habilitar,
    p_actor_user_id: actor.userId,
    p_actor_email: actor.email,
  });
}

function erroPiloto(motivo: string, requestId: string) {
  if (motivo === 'not_found') return errorResponse('Cliente não encontrado.', 'not_found', 404, requestId);
  if (motivo === 'fictitious_customer') return errorResponse('Registros fictícios não podem participar do piloto.', 'validation_error', 409, requestId);
  if (motivo === 'forbidden') return errorResponse('Seu perfil não tem permissão para esta operação.', 'unauthorized', 403, requestId);
  return errorResponse('Não foi possível alterar o piloto.', 'validation_error', 400, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) return actor;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { data, error } = await alterarPiloto(parsed.data.cliente_id, true, actor);
    if (error?.message?.includes('PILOT_LIMIT_REACHED')) return errorResponse('O piloto já possui o limite de 10 clientes.', 'validation_error', 409, requestId);
    if (error) throw error;
    if (!data?.ok) return erroPiloto(String(data?.motivo || ''), requestId);
    return successResponse({ cliente_id: parsed.data.cliente_id, no_piloto: true });
  } catch (error) {
    logError('/api/admin/clientes/piloto', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/admin/clientes/piloto', requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof Response) return actor;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { data, error } = await alterarPiloto(parsed.data.cliente_id, false, actor);
    if (error) throw error;
    if (!data?.ok) return erroPiloto(String(data?.motivo || ''), requestId);
    return successResponse({ cliente_id: parsed.data.cliente_id, no_piloto: false });
  } catch (error) {
    logError('/api/admin/clientes/piloto', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/admin/clientes/piloto', requestId);
  }
}
