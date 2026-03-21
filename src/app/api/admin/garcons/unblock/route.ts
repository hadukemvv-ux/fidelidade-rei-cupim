import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  successResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const UnblockGarcomSchema = z.object({
  garcom_id: z.coerce.number().int().positive('ID do garçom inválido'),
  motivo: z.string().trim().min(3).max(255).optional(),
});

type UnblockGarcomInput = z.infer<typeof UnblockGarcomSchema>;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<UnblockGarcomInput>(UnblockGarcomSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { garcom_id, motivo } = validacao.data;

    logInfo('/api/admin/garcons/unblock', 'Registrando desbloqueio manual de garcom', {
      garcom_id,
      requestId,
    });

    const { error: insertError } = await supabaseAdmin.from('garcons_logs').insert({
      garcom_id,
      premio: 'DESBLOQUEIO',
      telefone_cliente: null,
      ip: 'painel-admin',
      user_agent: 'painel-admin',
      score: 0,
      suspeito: false,
      motivo: motivo || 'Desbloqueado manualmente pelo administrador',
    });

    if (insertError) {
      logError('/api/admin/garcons/unblock', insertError as Error, {
        garcom_id,
        requestId,
      });
      return handleApiError(insertError, '/api/admin/garcons/unblock', requestId);
    }

    logInfo('/api/admin/garcons/unblock', 'Desbloqueio de garcom registrado com sucesso', {
      garcom_id,
      requestId,
    });

    return successResponse({
      message: 'Garcom desbloqueado com sucesso!',
      garcom_id,
    });
  } catch (error) {
    logError(
      '/api/admin/garcons/unblock',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/garcons/unblock', requestId);
  }
}