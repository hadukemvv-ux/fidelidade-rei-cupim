import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { errorResponse, getRequestId, handleApiError, logError, successResponse, validationErrorResponse } from '@/lib/api-utils';

const schema = z.object({ cliente_id: z.coerce.number().int().positive() });

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { data: customer, error: customerError } = await supabaseAdmin.from('base_clientes_saipos').select('id, nome, email').eq('id', parsed.data.cliente_id).maybeSingle();
    if (customerError) throw customerError;
    if (!customer) return errorResponse('Cliente não encontrado.', 'not_found', 404, requestId);
    if (/^Cliente Teste\b/i.test(String(customer.nome || '')) || /@(teste|example)\.com$/i.test(String(customer.email || ''))) {
      return errorResponse('Registros fictícios não podem participar do piloto.', 'validation_error', 409, requestId);
    }
    const { error } = await supabaseAdmin.from('piloto_clientes').upsert({ cliente_id: parsed.data.cliente_id }, { onConflict: 'cliente_id', ignoreDuplicates: true });
    if (error?.message?.includes('PILOT_LIMIT_REACHED')) return errorResponse('O piloto já possui o limite de 10 clientes.', 'validation_error', 409, requestId);
    if (error) throw error;
    return successResponse({ cliente_id: parsed.data.cliente_id, no_piloto: true });
  } catch (error) {
    logError('/api/admin/clientes/piloto', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/admin/clientes/piloto', requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { error } = await supabaseAdmin.from('piloto_clientes').delete().eq('cliente_id', parsed.data.cliente_id);
    if (error) throw error;
    return successResponse({ cliente_id: parsed.data.cliente_id, no_piloto: false });
  } catch (error) {
    logError('/api/admin/clientes/piloto', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/admin/clientes/piloto', requestId);
  }
}
