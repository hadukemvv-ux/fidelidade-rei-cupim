/**
 * Compatibility helper for legacy administrative endpoints.
 *
 * Every caller now needs a signed-in user with an active operational role in
 * `perfis_operacionais`. E-mail allowlists and a shared static admin token are
 * deliberately not accepted: both bypass the role/audit model used by /admin.
 */
import { NextResponse } from "next/server";
import {
  requireOperationalActor,
  type OperationalRole,
} from "@/lib/operationalAuth";

export async function validateAdminAuth(
  request: Request,
  _url?: URL,
  minimumRole: OperationalRole = "gestor"
) {
  const actor = await requireOperationalActor(request, minimumRole);
  return actor instanceof NextResponse ? actor : null;
}

/**
 * Helper para checar se a requisição é autenticada
 * Throw erro se não for autenticado
 */
export async function requireAdminAuth(
  request: Request,
  url?: URL,
  minimumRole: OperationalRole = "gestor"
) {
  const result = await validateAdminAuth(request, url, minimumRole);
  if (result) {
    throw result;
  }
}
