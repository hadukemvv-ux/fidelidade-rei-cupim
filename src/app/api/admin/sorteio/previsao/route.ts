import { sorteioLegadoPausadoResponse } from '@/lib/legacySorteio';

/** O cálculo de chances do mecanismo legado não pode ser consultado enquanto ele está pausado. */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}
