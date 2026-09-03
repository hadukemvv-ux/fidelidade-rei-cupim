import { NextRequest, NextResponse } from 'next/server';
import { processarVenda } from '../processarVenda';
import { buscarVendasSaipos, SaiposApiError } from '@/lib/saipos';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

function formatarData(d: string) {
  return new Date(d).toISOString();
}

export async function GET(req: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado. Configure para proteger este endpoint.' },
        { status: 500 }
      );
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
      || req.nextUrl.searchParams.get('token');

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
      const d = new Date(dia);
      inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
      fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
    }

    // Caso 2: "?inicio=YYYY-MM-DD&fim=YYYY-MM-DD"
    else if (inicioParam && fimParam) {
      inicio = formatarData(inicioParam);
      fim = formatarData(fimParam);
    }

    // Caso 3: nada → HOJE
    else {
      const hoje = new Date();
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0).toISOString();
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
    }

    const vendas = await buscarVendasSaipos({ inicio, fim, limit: 500 });

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
