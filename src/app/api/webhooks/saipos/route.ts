import { NextResponse } from 'next/server';
import { processarVenda } from '@/app/api/cron/saipos/processarVenda';

export async function POST(request: Request) {
  const secret = process.env.SAIPOS_TOKEN;
  const provided = request.headers.get('x-auth-token');

  if (!secret) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const idSale = body.id_sale ?? body.sale_id ?? body.order_id ?? body.id_pedido;
    const totalAmount = body.total_amount ?? body.order_total ?? body.valor_total;
    const phone = body.customer?.phone ?? body.customer_phone ?? body.telefone;

    if (!idSale) {
      return NextResponse.json({ error: 'Identificador da venda ausente.' }, { status: 400 });
    }

    const resultado = await processarVenda({
      ...body,
      id_sale: idSale,
      total_amount: totalAmount,
      customer: {
        ...(body.customer || {}),
        phone,
        name: body.customer?.name ?? body.customer_name,
      },
    });

    if (resultado.status === 'ignorada') {
      return NextResponse.json({ ok: false, id_sale: resultado.idSale, motivo: resultado.motivo });
    }

    return NextResponse.json({
      ok: true,
      id_sale: resultado.idSale,
      duplicada: resultado.status === 'duplicada',
      credito: resultado.status === 'processada' ? resultado.credito : undefined,
    });
  } catch (error) {
    console.error('Erro no webhook Saipos:', error);
    return NextResponse.json({ error: 'Falha ao processar a venda.' }, { status: 500 });
  }
}
