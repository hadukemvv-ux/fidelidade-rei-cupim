/**
 * Admin authentication validator
 * Supports:
 * - Authorization header: "Authorization: Bearer {token}"
 *
 * Auth strategies:
 * - Legacy: ADMIN_SECRET_TOKEN
 * - Modern: Supabase JWT + optional allowlist (ADMIN_ALLOWED_EMAILS)
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseAdminAllowedEmails() {
  const raw = process.env.ADMIN_ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function hasAdminRole(user: any) {
  const appRole = String(user?.app_metadata?.role || "").toLowerCase();
  const userRole = String(user?.user_metadata?.role || "").toLowerCase();
  const appIsAdmin = user?.app_metadata?.is_admin === true;
  const userIsAdmin = user?.user_metadata?.is_admin === true;

  return appRole === "admin" || appRole === "superadmin" || userRole === "admin" || userRole === "superadmin" || appIsAdmin || userIsAdmin;
}

export async function validateAdminAuth(request: Request, url?: URL) {
  const secret = process.env.ADMIN_SECRET_TOKEN;

  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '').trim();

  const token = headerToken;

  if (!token) {
    return NextResponse.json(
      { error: 'Token de autenticação obrigatório no header Authorization.' },
      { status: 401 }
    );
  }

  // Legacy admin token support (server-only secret)
  if (secret && token === secret) {
    return null;
  }

  // Modern admin auth: valid Supabase access token from signed-in session
  if (headerToken) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(headerToken);
      const user = data?.user;
      if (!error && user) {
        const adminAllowedEmails = parseAdminAllowedEmails();
        const userEmail = String(user.email || "").toLowerCase();
        const emailAllowed = adminAllowedEmails.includes(userEmail);
        const userIsAdmin = hasAdminRole(user);

        // Transitional mode:
        // - If allowlist is configured, enforce allowlist or explicit admin role
        // - If allowlist is not configured, keep backward compatibility (any valid session)
        if (adminAllowedEmails.length > 0) {
          if (emailAllowed || userIsAdmin) {
            return null;
          }

          return NextResponse.json(
            { error: 'Usuário autenticado, mas sem permissão administrativa.' },
            { status: 403 }
          );
        }

        if (userIsAdmin) {
          return null;
        }

        console.warn('⚠️ ADMIN_ALLOWED_EMAILS não configurado; permitindo sessão autenticada por compatibilidade.');
        return null;
      }
    } catch {
      // Intentionally ignored: falls through to 403 below.
    }
  }

  return NextResponse.json(
    { error: 'Token inválido ou expirado.' },
    { status: 403 }
  );
}

/**
 * Helper para checar se a requisição é autenticada
 * Throw erro se não for autenticado
 */
export async function requireAdminAuth(request: Request, url?: URL) {
  const result = await validateAdminAuth(request, url);
  if (result) {
    throw result;
  }
}
