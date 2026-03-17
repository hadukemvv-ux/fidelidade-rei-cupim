import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { processarVenda } from './processarVenda'; // MOTOR ÚNICO

export const dynamic = 'force-dynamic';

const SAIPOS_TOKEN = process.env.SAIPOS_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET;
const URL_SAIPOS = 'https://data.saipos.io/v1/search_sales';

// Função de log (continua aqui porque pertence AO CRON)
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
    // ✅ Validar token de cron
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

    const hoje = new Date();
    const inicio = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      0, 0, 0
    ).toISOString();
    const fim = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23, 59, 59
    ).toISOString();

    const params = new URLSearchParams({
      p_date_column_filter: 'shift_date',
      p_filter_date_start: inicio,
      p_filter_date_end: fim,
      p_limit: '200',
      p_offset: '0',
      p_store: '62039',
    });

    const response = await fetch(`${URL_SAIPOS}?${params}`, {
      headers: { Authorization: `Bearer ${SAIPOS_TOKEN}` },
    });

    if (!response.ok) {
      await registrarLog(
        "erro_api",
        `Erro Saipos: ${response.status}`
      );

      return NextResponse.json(
        { erro: 'Erro Saipos', detalhes: await response.text() },
        { status: response.status }
      );
    }

    const vendas = await response.json();

    // 🔥 USANDO O MOTOR ÚNICO
    for (const venda of vendas) {
      await processarVenda(venda);
    }

    return NextResponse.json({
      sucesso: true,
      processadas: vendas.length,
    });

  } catch (e: any) {
    await registrarLog("erro_fatal", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}