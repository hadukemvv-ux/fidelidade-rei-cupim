import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

/**
 * Não permite criar, editar ou publicar campanhas antigas. A futura versão
 * deverá ter regulamento, autorização quando aplicável e auditoria própria.
 */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}

export async function POST() {
  return sorteioLegadoPausadoResponse();
}
