import { NextRequest, NextResponse } from 'next/server';

/**
 * O cron antigo descontava 30% todos os dias entre 30 e 59 dias de inatividade.
 * Ele permanece como resposta inofensiva até a expiração por lote/ledger ser implantada.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado.' }, { status: 500 });
  }
  if (token !== secret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    skipped: true,
    reason: 'Expiração destrutiva desativada até a implantação do ledger de benefícios.',
  });
}
