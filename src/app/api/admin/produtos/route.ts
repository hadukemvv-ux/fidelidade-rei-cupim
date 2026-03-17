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

const CAMPOS_VALIDOS = [
  'nome',
  'descricao',
  'custo_em_pontos',
  'categoria',
  'imagem_url',
  'destaque',
  'ativo'
];

function filtrarCampos(body: any) {
  const permitido: any = {};
  for (const key of CAMPOS_VALIDOS) {
    if (body[key] !== undefined) permitido[key] = body[key];
  }
  return permitido;
}

const ProdutoPutSchema = z.object({
  id: z.coerce.number().int().positive('ID e obrigatorio'),
  nome: z.string().trim().min(1).max(255).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  custo_em_pontos: z.coerce.number().int().positive().optional(),
  categoria: z.string().max(120).optional(),
  imagem_url: z.string().max(2048).optional().nullable(),
  destaque: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

const ProdutoPostSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do produto e obrigatorio').max(255),
  descricao: z.string().max(1000).optional().nullable(),
  custo_em_pontos: z.coerce.number().int().positive('Custo em pontos invalido'),
  categoria: z.string().max(120).optional(),
  imagem_url: z.string().max(2048).optional().nullable(),
  destaque: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

type ProdutoPutInput = z.infer<typeof ProdutoPutSchema>;
type ProdutoPostInput = z.infer<typeof ProdutoPostSchema>;

// ================================
// PUT — Atualizar produto
// ================================
export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<ProdutoPutInput>(ProdutoPutSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { id } = validacao.data;

    if (!id) {
      return errorResponse('ID e obrigatorio', 'validation_error');
    }

    const updates = filtrarCampos(validacao.data);
    updates.atualizado_em = new Date().toISOString();

    // Garantir formato correto do path da imagem
    if (updates.imagem_url && !updates.imagem_url.startsWith('/'))
      updates.imagem_url = '/' + updates.imagem_url;

    const { data, error } = await supabaseAdmin
      .from('produtos_loja')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logError('/api/admin/produtos', error as Error, { id, requestId });
      return handleApiError(error, '/api/admin/produtos', requestId);
    }

    logInfo('/api/admin/produtos', 'Produto atualizado com sucesso', {
      id,
      requestId,
    });

    return successResponse({ produto: data });
  } catch (error) {
    logError('/api/admin/produtos', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/produtos', requestId);
  }
}

// ================================
// POST — Criar novo produto
// ================================
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<ProdutoPostInput>(ProdutoPostSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const produto = filtrarCampos(validacao.data);

    produto.criado_em = new Date().toISOString();
    produto.atualizado_em = new Date().toISOString();
    produto.ativo = produto.ativo ?? true;
    produto.destaque = produto.destaque ?? false;

    if (!produto.categoria) produto.categoria = 'geral';

    if (produto.imagem_url && !produto.imagem_url.startsWith('/'))
      produto.imagem_url = '/' + produto.imagem_url;

    const { data, error } = await supabaseAdmin
      .from('produtos_loja')
      .insert([produto])
      .select('*')
      .single();

    if (error) {
      logError('/api/admin/produtos', error as Error, {
        nome: produto.nome,
        requestId,
      });
      return handleApiError(error, '/api/admin/produtos', requestId);
    }

    logInfo('/api/admin/produtos', 'Produto criado com sucesso', {
      produto_id: data?.id || null,
      requestId,
    });

    return successResponse({ produto: data });
  } catch (error) {
    logError('/api/admin/produtos', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/produtos', requestId);
  }
}