import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { errorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

/**
 * A importação antiga creditava vendas sem idempotência e fora da transação
 * usada pela integração Saipos. Ela permanece bloqueada até que o relatório
 * forneça um identificador único confiável para cada venda.
 */
export async function POST(request: NextRequest) {
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  return errorResponse(
    'Importação manual de vendas temporariamente indisponível. Use a integração automática da Saipos para preservar saldos e evitar duplicidades.',
    'server_error',
    503
  );
}
