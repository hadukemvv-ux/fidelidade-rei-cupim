import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

/** Não expõe nomes, telefones, tickets ou histórico do sorteio legado. */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}
