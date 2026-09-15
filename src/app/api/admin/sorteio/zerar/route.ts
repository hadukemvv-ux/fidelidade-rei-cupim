import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

/** Nunca zera tickets globalmente enquanto não houver uma campanha regular. */
export async function POST() {
  return sorteioLegadoPausadoResponse();
}
