/**
 * Admin authentication validator
 * Supports both:
 * - Authorization header: "Authorization: Bearer {token}"
 * - Query param: "?token={token}"
 * 
 * Token must match ADMIN_SECRET_TOKEN env var
 */

import { NextResponse } from "next/server";

export function validateAdminAuth(request: Request, url?: URL) {
  const secret = process.env.ADMIN_SECRET_TOKEN;

  if (!secret) {
    console.warn('⚠️ ADMIN_SECRET_TOKEN não configurado. Admin routes desprotegidas.');
    return NextResponse.json(
      { error: 'Admin token não configurado no servidor.' }, 
      { status: 500 }
    );
  }

  // Try header first
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '').trim();

  // Then try query param
  const urlObj = url || new URL(request.url);
  const queryToken = urlObj.searchParams.get('token');

  const token = headerToken || queryToken;

  if (!token) {
    return NextResponse.json(
      { error: 'Token de autenticação obrigatório (header ou query param).' },
      { status: 401 }
    );
  }

  if (token !== secret) {
    return NextResponse.json(
      { error: 'Token inválido ou expirado.' },
      { status: 403 }
    );
  }

  // ✅ Token válido
  return null;
}

/**
 * Helper para checar se a requisição é autenticada
 * Throw erro se não for autenticado
 */
export function requireAdminAuth(request: Request, url?: URL) {
  const result = validateAdminAuth(request, url);
  if (result) {
    throw result;
  }
}
