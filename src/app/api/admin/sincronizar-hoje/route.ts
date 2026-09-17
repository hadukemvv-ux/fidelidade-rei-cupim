import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { errorResponse, getRequestId } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url), 'superadmin');
  if (authError) return authError;

  return errorResponse(
    'A sincronização que altera clientes e pontos está pausada. Use o diagnóstico Saipos, que é somente leitura.',
    'error',
    410,
    requestId
  );
}
