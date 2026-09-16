import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json(
    {
      error: 'A roleta anterior está desativada. O piloto V2 permanece fechado.',
      code: 'LEGACY_ROULETTE_DISABLED',
    },
    { status: 410 }
  );
}
