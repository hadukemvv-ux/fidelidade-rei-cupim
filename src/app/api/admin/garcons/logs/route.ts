import { garconsLegadoPausadoResponse } from '@/lib/legacyGarcons';

export const dynamic = 'force-dynamic';

export async function GET() {
  return garconsLegadoPausadoResponse();
}
