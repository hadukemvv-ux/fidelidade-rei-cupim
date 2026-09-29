import { sorteioLegadoPausadoResponse } from '@/lib/legacySorteio';

/** O resumo do sorteio legado foi desativado junto com a sua operação. */
export async function GET() {
  return sorteioLegadoPausadoResponse();
}
