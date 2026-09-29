import { sorteioLegadoPausadoResponse } from '@/lib/legacySorteio';

/** A visualização detalhada do sorteio legado fica indisponível enquanto o módulo está pausado. */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}
