import { NextRequest, NextResponse } from 'next/server';
import { processarVenda } from '../processarVenda';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const SAIPOS_TOKEN = process.env.SAIPOS_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET;
const URL_SAIPOS = 'https://data.saipos.io/v1/search_sales';

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

    if (!SAIPOS_TOKEN) throw new Error('Token Saipos não configurado.');

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

    const params = new URLSearchParams({
      p_date_column_filter: 'shift_date',
      p_filter_date_start: inicio,
      p_filter_date_end: fim,
      p_limit: '500',
      p_offset: '0',
      p_store: '62039',
    });

    const response = await fetch(`${URL_SAIPOS}?${params}`, {
      headers: { Authorization: `Bearer ${SAIPOS_TOKEN}` },
    });

    if (!response.ok) {
      const erro = await response.text();
      return NextResponse.json(
        { erro: `Erro Saipos: ${erro}` },
        { status: response.status }
      );
    }

    const vendas = await response.json();

    // 🔥 PROCESSAR CADA VENDA USANDO O MOTOR ÚNICO
    let processadas = 0;

    for (const venda of vendas) {
      await processarVenda(venda);
      processadas++;
    }

    return NextResponse.json({
      sucesso: true,
      periodo_usado: { inicio, fim },
      vendas_recebidas: vendas.length,
      vendas_processadas: processadas,
    });

  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 });
  }
}