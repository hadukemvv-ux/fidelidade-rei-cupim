import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processarVenda } from '../processarVenda'; // IMPORTAÇÃO CORRETA

export const dynamic = 'force-dynamic';

const SAIPOS_TOKEN = process.env.SAIPOS_TOKEN!;
const SAIPOS_ID = process.env.SAIPOS_ID || '62039';
const CRON_SECRET = process.env.CRON_SECRET;
const URL_SAIPOS = 'https://data.saipos.io/v1/search_sales';

// Função auxiliar de logs
async function registrarLog(
  tipo: string,
  mensagem: string,
  id_cliente?: number,
  id_sale?: number,
  valor?: number
) {
  await supabaseAdmin
    .from('saipos_cron_logs')
    .insert({ tipo, mensagem, id_cliente, id_sale, valor });
}

export async function GET(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET não configurado. Configure para proteger este endpoint.' },
        { status: 500 }
      );
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || request.nextUrl.searchParams.get('token');

    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!SAIPOS_TOKEN) throw new Error('Token Saipos não configurado.');

    const url = new URL(request.url);

    const dias = url.searchParams.get("dias");
    const inicioRaw = url.searchParams.get("inicio");
    const fimRaw = url.searchParams.get("fim");

    let inicio: string;
    let fim: string;

    // ===============================
    // A) Range de dias
    // ===============================
    if (dias) {
      const hoje = new Date();
      const inicioDate = new Date(hoje.getTime() - Number(dias) * 86400000);

      inicio = new Date(
        inicioDate.getFullYear(),
        inicioDate.getMonth(),
        inicioDate.getDate(),
        0, 0, 0
      ).toISOString();

      fim = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate(),
        23, 59, 59
      ).toISOString();
    }

    // ===============================
    // B) Intervalo direto
    // ===============================
    else if (inicioRaw && fimRaw) {
      inicio = new Date(inicioRaw).toISOString();
      fim = new Date(fimRaw).toISOString();
    }

    // ===============================
    // C) Nenhum parâmetro
    // ===============================
    else {
      return NextResponse.json({
        erro: "Use ?dias=30 OU ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD"
      });
    }

    // Parâmetros Saipos
    const params = new URLSearchParams({
      p_date_column_filter: 'shift_date',
      p_filter_date_start: inicio,
      p_filter_date_end: fim,
      p_limit: '500',
      p_offset: '0',
      p_store: SAIPOS_ID,
    });

    const response = await fetch(`${URL_SAIPOS}?${params}`, {
      headers: { Authorization: `Bearer ${SAIPOS_TOKEN}` },
    });

    if (!response.ok) {
      await registrarLog("erro_api_historico", `Erro Saipos: ${response.status}`);
      return NextResponse.json(
        { erro: 'Erro Saipos', detalhes: await response.text() },
        { status: response.status }
      );
    }

    const vendas = await response.json();

    // ===============================
    // PROCESSAMENTO COM O MOTOR ÚNICO
    // ===============================
    for (const venda of vendas) {
      await processarVenda(venda);
    }

    return NextResponse.json({
      sucesso: true,
      vendas_recebidas: vendas.length,
      periodo: { inicio, fim }
    });

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}