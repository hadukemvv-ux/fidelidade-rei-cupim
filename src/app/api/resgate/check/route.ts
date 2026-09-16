import { NextResponse } from 'next/server';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export async function POST(req: Request) {
  try {
    const blocked = await bloquearSeContencaoAtiva();
    if (blocked) return blocked;
    const body = await req.json();
    const telefone = onlyDigits(body?.telefone || '');

    if (telefone.length !== 11) {
      return NextResponse.json(
        { ok: false, status: 'erro', error: 'Telefone inválido' },
        { status: 400 }
      );
    }

    // Não revela se um telefone possui, não possui ou iniciou cadastro. A
    // confirmação real acontece com PIN ou OTP no fluxo seguinte.
    return NextResponse.json({
      ok: true,
      status: 'prosseguir',
    });

  } catch {
    return NextResponse.json(
      { ok: false, status: 'erro', error: 'Não foi possível continuar agora.' },
      { status: 500 }
    );
  }
}
