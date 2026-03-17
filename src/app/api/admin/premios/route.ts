import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const PremioUpdateSchema = z.object({
  id: z.coerce.number().int().positive('ID do premio invalido'),
  nome: z.string().trim().min(1).max(255).optional(),
  descricao_vitoria: z.string().max(500).optional().nullable(),
  emoji: z.string().max(16).optional(),
  probabilidade: z.coerce.number().int().min(0).max(100000).optional(),
  ativo: z.boolean().optional(),
  valor: z.coerce.number().min(0).optional(),
});

type PremioUpdateInput = z.infer<typeof PremioUpdateSchema>;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

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

    return successResponse({ premios: data || [] });
  } catch (error) {
    logError('/api/admin/premios', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/premios', requestId);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<PremioUpdateInput>(PremioUpdateSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { id, ...updateData } = validacao.data;

    if (Object.keys(updateData).length === 0) {
      return errorResponse('Nenhum campo valido para atualizar', 'validation_error');
    }

    logInfo('/api/admin/premios', 'Atualizando premio da roleta', {
      id,
      campos: Object.keys(updateData),
      requestId,
    });

    const { error } = await supabaseAdmin
      .from('premios_roleta')
      .update(updateData)
      .eq('id', id);

    if (error) {
      logError('/api/admin/premios', error as Error, { id, requestId });
      return handleApiError(error, '/api/admin/premios', requestId);
    }

    return successResponse({ atualizado: true, id });
  } catch (error) {
    logError('/api/admin/premios', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/premios', requestId);
  }
}