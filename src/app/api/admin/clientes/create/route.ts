import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { errorResponse, getRequestId } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;
  return errorResponse('A criação de clientes fictícios foi desativada. Cadastros devem partir de um cliente real.', 'validation_error', 410, requestId);
}
