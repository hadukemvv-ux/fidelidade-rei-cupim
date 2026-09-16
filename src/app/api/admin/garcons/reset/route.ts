import { garconsLegadoPausadoResponse } from '@/lib/legacyGarcons';

export const dynamic = 'force-dynamic';

export async function POST() {
  return garconsLegadoPausadoResponse();
}
