import { NextRequest, NextResponse } from 'next/server';
import { processarVenda } from '../processarVenda';
import {
  buscarTodasVendasSaipos,
  periodoDiaSaoPaulo,
  periodoUltimosDiasSaoPaulo,
  SaiposApiError,
} from '@/lib/saipos';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado. Configure para proteger este endpoint.' },
        { status: 500 }
      );
    }

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const dia = searchParams.get("dia");
    const inicioParam = searchParams.get("inicio");
    const fimParam = searchParams.get("fim");

    let inicio: string;
    let fim: string;

    // Caso 1: "?dia=YYYY-MM-DD"
    if (dia) {
      ({ inicio, fim } = periodoDiaSaoPaulo(dia));
    }

    // Caso 2: "?inicio=YYYY-MM-DD&fim=YYYY-MM-DD"
    else if (inicioParam && fimParam) {
      inicio = new Date(inicioParam).toISOString();
      fim = new Date(fimParam).toISOString();
    }

    // Caso 3: nada → HOJE
    else {
      ({ inicio, fim } = periodoUltimosDiasSaoPaulo(1));
    }

    const vendas = await buscarTodasVendasSaipos({ inicio, fim, pageSize: 200 });

    // 🔥 PROCESSAR CADA VENDA USANDO O MOTOR ÚNICO
    let processadas = 0;
    let falhas = 0;

    for (const venda of vendas) {
      try {
        await processarVenda(venda);
        processadas++;
      } catch {
        falhas++;
      }
    }

    return NextResponse.json({
      sucesso: true,
      periodo_usado: { inicio, fim },
      vendas_recebidas: vendas.length,
      vendas_processadas: processadas,
      falhas,
    });

  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json(
      {
        erro: mensagem,
        ...(err instanceof SaiposApiError ? { tentativas: err.tentativas } : {}),
      },
      { status: err instanceof SaiposApiError ? err.status : 500 }
    );
  }
}
