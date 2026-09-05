import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { successResponse, getRequestId, logInfo, logError, handleApiError, validationErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(50).default(20),
  q: z.string().trim().max(100).default(''),
  status: z.enum(['todos', 'cadastro_seguro', 'com_compras', 'aniversario', 'piloto', 'teste']).default('todos'),
});

const fields = 'id, telefone, nome, email, nivel, pontos, cashback, tickets, total_gasto, qtd_pedidos, ultima_compra, data_nascimento, aceita_whatsapp_aniversario, pin_hash';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { page, page_size: pageSize, q, status } = parsed.data;

    const { data: pilotRows, error: pilotError } = await supabaseAdmin.from('piloto_clientes').select('cliente_id');
    if (pilotError) throw pilotError;
    const pilotIds = (pilotRows || []).map((row) => Number(row.cliente_id));
    const pilotSet = new Set(pilotIds);

    const [allCount, completeCount, purchasesCount, birthdayCount, testCount] = await Promise.all([
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).like('pin_hash', 'scrypt$%'),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).gt('qtd_pedidos', 0),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).eq('aceita_whatsapp_aniversario', true),
      supabaseAdmin.from('base_clientes_saipos').select('id', { count: 'exact', head: true }).or('nome.ilike.Cliente Teste %,email.ilike.%@teste.com,email.ilike.%@example.com'),
    ]);
    const countError = allCount.error || completeCount.error || purchasesCount.error || birthdayCount.error || testCount.error;
    if (countError) throw countError;

    let query = supabaseAdmin.from('base_clientes_saipos').select(fields, { count: 'exact' });
    if (status === 'cadastro_seguro') query = query.like('pin_hash', 'scrypt$%');
    if (status === 'com_compras') query = query.gt('qtd_pedidos', 0);
    if (status === 'aniversario') query = query.eq('aceita_whatsapp_aniversario', true);
    if (status === 'teste') query = query.or('nome.ilike.Cliente Teste %,email.ilike.%@teste.com,email.ilike.%@example.com');
    if (status === 'piloto') {
      if (pilotIds.length === 0) {
        return successResponse({
          pagina: page,
          porPagina: pageSize,
          total: 0,
          totalPaginas: 0,
          clientes: [],
          resumo: summary(allCount.count, completeCount.count, purchasesCount.count, birthdayCount.count, testCount.count, pilotIds.length),
        });
      }
      query = query.in('id', pilotIds);
    }

    if (q) {
      const safeText = q.replace(/[,()%]/g, ' ').replace(/\s+/g, ' ').trim();
      const digits = q.replace(/\D/g, '');
      const filters = [`nome.ilike.%${safeText}%`, `email.ilike.%${safeText}%`];
      if (digits) filters.push(`telefone.ilike.%${digits}%`);
      query = query.or(filters.join(','));
    }

    const start = (page - 1) * pageSize;
    const { data, error, count } = await query
      .order('ultima_compra', { ascending: false, nullsFirst: false })
      .order('nome', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) throw error;

    const clientes = (data || []).map(({ pin_hash, ...cliente }) => ({
      ...cliente,
      conta_segura: String(pin_hash || '').startsWith('scrypt$'),
      no_piloto: pilotSet.has(Number(cliente.id)),
      registro_teste: isTestRecord(cliente.nome, cliente.email),
    }));

    logInfo('/api/admin/clientes', 'Clientes listados com paginação', { page, pageSize, total: count || 0, status, requestId });
    return successResponse({
      pagina: page,
      porPagina: pageSize,
      total: count || 0,
      totalPaginas: Math.ceil((count || 0) / pageSize),
      clientes,
      resumo: summary(allCount.count, completeCount.count, purchasesCount.count, birthdayCount.count, testCount.count, pilotIds.length),
    });
  } catch (error) {
    logError('/api/admin/clientes', error instanceof Error ? error : new Error(String(error)), { requestId });
    return handleApiError(error, '/api/admin/clientes', requestId);
  }
}

function summary(total: number | null, complete: number | null, purchases: number | null, birthday: number | null, tests: number | null, pilot: number) {
  return { total: total || 0, cadastrosSeguros: complete || 0, comCompras: purchases || 0, aniversario: birthday || 0, registrosTeste: tests || 0, piloto: pilot };
}

function isTestRecord(name: unknown, email: unknown) {
  return /^Cliente Teste\b/i.test(String(name || '')) || /@(teste|example)\.com$/i.test(String(email || ''));
}
