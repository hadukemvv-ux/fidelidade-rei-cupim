import { NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';

export const dynamic = 'force-dynamic';

/** Perfil mínimo para escolher a tela inicial sem expor dados administrativos. */
export async function GET(request: Request) {
  const actor = await requireOperationalActor(request, 'garcom');
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json({ perfil: { nome: actor.nome, papel: actor.papel } });
}
