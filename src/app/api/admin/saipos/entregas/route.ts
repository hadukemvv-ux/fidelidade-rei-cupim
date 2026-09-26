import { NextRequest, NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { buscarTodasVendasSaipos, periodoDiaSaoPaulo, SaiposApiError } from '@/lib/saipos';
import { buscarHistoricosStatusSaipos } from '@/lib/saiposStatusHistory';
import { summarizeDelivery } from '@/lib/saiposDelivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof NextResponse) return actor;

  const day = new URL(request.url).searchParams.get('dia') || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    const { inicio, fim } = periodoDiaSaoPaulo(day);
    const [sales, historyResult] = await Promise.all([
      buscarTodasVendasSaipos({ inicio, fim, dateColumnFilter: 'created_at', pageSize: 500, maxPages: 4 }),
      buscarHistoricosStatusSaipos({ inicio, fim, maxPages: 4 }).catch(() => null),
    ]);

    const histories = new Map((historyResult?.rows || []).map((row) => [String(row.id_sale), row]));
    const deliverySales = sales.filter((sale) => Number((sale as Record<string, unknown>).id_sale_type) === 1);
    const rows = deliverySales.map((sale) => summarizeDelivery(
      sale as Record<string, unknown>, histories.get(String(sale.id_sale)),
    ));
    const byChannel = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.channel_class] = (counts[row.channel_class] || 0) + 1;
      return counts;
    }, {});
    const recentRows = rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 150);

    return NextResponse.json({
      ok: true,
      modo: 'somente_leitura',
      day,
      sales_scanned: sales.length,
      delivery_count: rows.length,
      by_channel: byChannel,
      history_available: historyResult !== null,
      history_complete: historyResult?.complete || false,
      shown_count: recentRows.length,
      rows: recentRows,
      note: 'Diagnóstico, não comprovação de atraso. Nenhum cupom, cliente ou pedido foi criado ou alterado.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SaiposApiError) {
      return NextResponse.json({ error: 'A Saipos não concluiu a consulta.', status_fornecedor: error.status }, { status: 502 });
    }
    if (error instanceof Error && error.message === 'Token da API de Dados Saipos não configurado.') {
      return NextResponse.json({ error: 'Conexão Saipos não configurada no servidor.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Não foi possível consultar as entregas.' }, { status: 400 });
  }
}
