import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function onlyDigits(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

export async function validateCustomerAuth(request: Request, expectedPhone: string) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const authenticatedPhone = onlyDigits(data?.user?.phone);

  if (error || !data?.user) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
  }

  if (!authenticatedPhone || authenticatedPhone.slice(-11) !== onlyDigits(expectedPhone).slice(-11)) {
    return NextResponse.json({ error: 'A conta autenticada não corresponde ao telefone informado.' }, { status: 403 });
  }

  return null;
}
