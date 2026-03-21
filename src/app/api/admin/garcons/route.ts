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

export const dynamic = 'force-dynamic'; // Garante que não faça cache estático

const GarcomSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255),
  codigo_prefixo: z.string().regex(/^\d{2}$/, 'Codigo prefixo deve ter 2 digitos'),
});

type GarcomInput = z.infer<typeof GarcomSchema>;

const GarcomIdQuerySchema = z.object({
  id: z.coerce.number().int().positive('ID do garcom invalido'),
});

type GarcomIdQueryInput = z.infer<typeof GarcomIdQuerySchema>;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/garcons', 'Listando garcons ativos', { requestId });

    const { data, error } = await supabaseAdmin
      .from('garcons')
      .select('id, nome, codigo_prefixo, total_giros, ativo, criado_em, atualizado_em')
      .eq('ativo', true)
      .order('total_giros', { ascending: false });

    if (error) {
      logError('/api/admin/garcons', error as Error, { requestId });
      return handleApiError(error, '/api/admin/garcons', requestId);
    }

    const garcons = data || [];

    logInfo('/api/admin/garcons', 'Garcons ativos listados com sucesso', {
      total: garcons.length,
      requestId,
    });

    return successResponse({ garcons });
  } catch (error) {
    logError('/api/admin/garcons', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/garcons', requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<GarcomInput>(GarcomSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { nome, codigo_prefixo } = validacao.data;

    logInfo('/api/admin/garcons', 'Criando novo garcom', {
      nome,
      codigo_prefixo,
      requestId,
    });

    const { data, error } = await supabaseAdmin
      .from('garcons')
      .insert({
        nome,
        codigo_prefixo,
        total_giros: 0,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .select('id, nome, codigo_prefixo, total_giros, ativo, criado_em, atualizado_em')
      .single();

    if (error) {
      logError('/api/admin/garcons', error as Error, {
        nome,
        codigo_prefixo,
        requestId,
      });
      return handleApiError(error, '/api/admin/garcons', requestId);
    }

    return successResponse({
      message: 'Garcom criado com sucesso',
      garcom: data,
    });
  } catch (error) {
    logError('/api/admin/garcons', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/garcons', requestId);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryValidacao = validarDados<GarcomIdQueryInput>(GarcomIdQuerySchema, {
      id: searchParams.get('id'),
    });

    if (!queryValidacao.ok) {
      return validationErrorResponse(queryValidacao.error);
    }

    const body = await request.json();
    const bodyValidacao = validarDados<GarcomInput>(GarcomSchema, body);

    if (!bodyValidacao.ok) {
      return validationErrorResponse(bodyValidacao.error);
    }

    const { id } = queryValidacao.data;
    const { nome, codigo_prefixo } = bodyValidacao.data;

    logInfo('/api/admin/garcons', 'Atualizando garcom', {
      id,
      nome,
      codigo_prefixo,
      requestId,
    });

    const { error } = await supabaseAdmin
      .from('garcons')
      .update({
        nome,
        codigo_prefixo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logError('/api/admin/garcons', error as Error, {
        id,
        requestId,
      });
      return handleApiError(error, '/api/admin/garcons', requestId);
    }

    return successResponse({ atualizado: true, id });
  } catch (error) {
    logError('/api/admin/garcons', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/garcons', requestId);
  }
}