import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

/** Impede a distribuição aleatória e o reset global de tickets do legado. */
export async function POST() {
  return sorteioLegadoPausadoResponse();
}
