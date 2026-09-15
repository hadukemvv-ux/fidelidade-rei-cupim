import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

export async function GET() {
  return sorteioLegadoPausadoResponse();
}
