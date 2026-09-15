import { sorteioLegadoPausadoResponse } from "@/lib/legacySorteio";

/**
 * Mantido somente para que uma chamada antiga não vire erro ambíguo. O cron
 * foi removido da Vercel: não há sorteio automático, leitura de tickets ou
 * reset de saldos enquanto esta modalidade estiver pausada.
 */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}
