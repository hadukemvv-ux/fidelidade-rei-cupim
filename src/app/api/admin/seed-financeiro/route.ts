import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { errorResponse, getRequestId } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  return errorResponse(
    'A geração de clientes fictícios foi desativada. Use somente clientes convidados no piloto.',
    'validation_error',
    410,
    requestId
  );
}
