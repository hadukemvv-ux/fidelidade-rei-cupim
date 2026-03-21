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

const SorteioAdminSchema = z.object({
  id: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  titulo: z.string().trim().min(3, 'Titulo e obrigatorio').max(255),
  descricao: z.string().max(1000).optional().nullable(),
  imagem_url: z.string().max(2048).optional().nullable(),
  data_sorteio: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Data do sorteio invalida',
  }),
  modo: z.enum(['manual', 'automatico']),
});

type SorteioAdminInput = z.infer<typeof SorteioAdminSchema>;

// ======================================================
// GET — Buscar sorteio ativo / em andamento
// ======================================================
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/sorteio', 'Buscando sorteio ativo', { requestId });

    const { data, error } = await supabaseAdmin
      .from('sorteios')
      .select('id, titulo, descricao, imagem_url, data_sorteio, modo, status, criado_em')
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false })
      .limit(1);

    if (error) {
      logError('/api/admin/sorteio', error as Error, { requestId });
      return handleApiError(error, '/api/admin/sorteio', requestId);
    }

    const sorteio = data?.[0] || null;

    logInfo('/api/admin/sorteio', 'Sorteio ativo consultado com sucesso', {
      sorteio_id: sorteio?.id || null,
      requestId,
    });

    return successResponse({ sorteio });

  } catch (error) {
    logError('/api/admin/sorteio', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/sorteio', requestId);
  }
}

// ======================================================
// POST — Criar / Atualizar sorteio
// ======================================================
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<SorteioAdminInput>(SorteioAdminSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { id, titulo, descricao, imagem_url, data_sorteio, modo } = validacao.data;

    logInfo('/api/admin/sorteio', 'Iniciando persistencia de sorteio', {
      sorteio_id: id || null,
      modo,
      requestId,
    });

    // ======================================================
    // UPDATE EXISTENTE
    // ======================================================
    if (id) {
      const { error: updateError } = await supabaseAdmin
        .from('sorteios')
        .update({
          titulo,
          descricao,
          imagem_url,
          data_sorteio,
          modo,
          status: 'ativo',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        logError('/api/admin/sorteio', updateError as Error, {
          sorteio_id: id,
          requestId,
        });
        return handleApiError(updateError, '/api/admin/sorteio', requestId);
      }

      logInfo('/api/admin/sorteio', 'Sorteio atualizado com sucesso', {
        sorteio_id: id,
        requestId,
      });

      return successResponse({
        atualizado: true,
        sorteio_id: id,
      });
    }

    // ======================================================
    // CREATE — garantir que só exista 1 ativo
    // ======================================================
    const { error: concluirError } = await supabaseAdmin
      .from('sorteios')
      .update({ status: 'concluido' })
      .in('status', ['ativo', 'andamento', 'aberto', 'criado']);

    if (concluirError) {
      logError('/api/admin/sorteio', concluirError as Error, { requestId });
      return handleApiError(concluirError, '/api/admin/sorteio', requestId);
    }

    // Criar sorteio novo
    const { data, error: insertError } = await supabaseAdmin
      .from('sorteios')
      .insert({
        titulo,
        descricao,
        imagem_url,
        data_sorteio,
        modo,
        status: 'ativo',
        criado_em: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      logError('/api/admin/sorteio', insertError as Error, { requestId });
      return handleApiError(insertError, '/api/admin/sorteio', requestId);
    }

    logInfo('/api/admin/sorteio', 'Sorteio criado com sucesso', {
      sorteio_id: data?.id || null,
      requestId,
    });

    return successResponse({
      criado: true,
      sorteio: data,
    });

  } catch (error) {
    logError('/api/admin/sorteio', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/sorteio', requestId);
  }
}