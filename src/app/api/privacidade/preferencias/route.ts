import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCustomerSessionFromRequest } from '@/lib/customerSession';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { errorResponse, getRequestId, handleApiError, logError, logInfo, successResponse, validationErrorResponse } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RevogacaoSchema = z.object({
  revogar: z.enum(['marketing', 'aniversario']),
});

type ClientePreferencias = {
  id: number;
  marketing_opt_in: boolean | null;
  marketing_opt_in_em: string | null;
  marketing_opt_out_em: string | null;
  aceita_whatsapp_aniversario: boolean | null;
  aceite_whatsapp_aniversario_em: string | null;
};

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function telefoneDaSessao(request: NextRequest) {
  return getCustomerSessionFromRequest(request)?.phone || null;
}

async function buscarCliente(telefone: string) {
  const { data, error } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('id, marketing_opt_in, marketing_opt_in_em, marketing_opt_out_em, aceita_whatsapp_aniversario, aceite_whatsapp_aniversario_em')
    .eq('telefone', telefone)
    .maybeSingle();
  if (error) throw error;
  return data as ClientePreferencias | null;
}

function apresentarPreferencias(cliente: ClientePreferencias) {
  return {
    marketingWhatsapp: Boolean(cliente.marketing_opt_in),
    marketingConcedidoEm: cliente.marketing_opt_in_em,
    marketingRevogadoEm: cliente.marketing_opt_out_em,
    aniversarioWhatsapp: Boolean(cliente.aceita_whatsapp_aniversario),
    aniversarioConcedidoEm: cliente.aceite_whatsapp_aniversario_em,
  };
}

export async function GET(request: NextRequest) {
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;

  const telefone = telefoneDaSessao(request);
  if (!telefone) return errorResponse('Sessão não encontrada.', 'unauthorized', 401);

  try {
    const cliente = await buscarCliente(telefone);
    if (!cliente) return errorResponse('Cliente não encontrado.', 'not_found', 404);
    return successResponse({ preferencias: apresentarPreferencias(cliente) });
  } catch (error) {
    logError('/api/privacidade/preferencias', error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error, '/api/privacidade/preferencias');
  }
}

/**
 * Revoga um consentimento do titular autenticado. Esta rota deliberadamente
 * não aceita opt-in: novo aceite deve ocorrer no contexto com texto, versão e
 * finalidade apresentados ao cliente.
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;

  const telefone = telefoneDaSessao(request);
  if (!telefone) return errorResponse('Sessão não encontrada.', 'unauthorized', 401, requestId);

  const parsed = RevogacaoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    const cliente = await buscarCliente(telefone);
    if (!cliente) return errorResponse('Cliente não encontrado.', 'not_found', 404, requestId);

    const agora = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (parsed.data.revogar === 'marketing') {
      const { error: consentimentoError } = await supabaseAdmin.from('consentimentos_marketing').insert({
        cliente_id: cliente.id,
        telefone_hash: hash(telefone),
        finalidade: 'marketing_promocoes',
        concedido: false,
        texto_versao: 'marketing-revogacao-cliente-v1',
        canal: 'whatsapp',
        origem: 'portal_cliente',
        ip_hash: hash(ip),
        criado_em: agora,
      });
      if (consentimentoError) throw consentimentoError;
    } else {
      const { error: aniversarioError } = await supabaseAdmin
        .from('base_clientes_saipos')
        .update({ aceita_whatsapp_aniversario: false, atualizado_em: agora })
        .eq('id', cliente.id);
      if (aniversarioError) throw aniversarioError;
    }

    const { error: auditoriaError } = await supabaseAdmin.from('auditoria_fidelidade').insert({
      cliente_id: cliente.id,
      acao: 'consentimento_revogado',
      entidade: 'preferencias_cliente',
      entidade_id: String(cliente.id),
      detalhes: { finalidade: parsed.data.revogar, origem: 'portal_cliente', request_id: requestId },
      criado_em: agora,
    });
    if (auditoriaError) throw auditoriaError;

    const atualizado = await buscarCliente(telefone);
    if (!atualizado) throw new Error('Cliente não encontrado após atualização.');

    logInfo('/api/privacidade/preferencias', 'Consentimento revogado pelo cliente', {
      clienteId: cliente.id,
      finalidade: parsed.data.revogar,
      requestId,
    });
    return successResponse({ preferencias: apresentarPreferencias(atualizado) });
  } catch (error) {
    logError('/api/privacidade/preferencias', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/privacidade/preferencias', requestId);
  }
}
