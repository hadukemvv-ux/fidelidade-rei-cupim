import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buscarTodasVendasSaipos, periodoUltimosDiasSaoPaulo, SaiposApiError } from '@/lib/saipos';
import { processarVenda } from '../processarVenda'; // IMPORTAÇÃO CORRETA

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

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

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

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
      ({ inicio, fim } = periodoUltimosDiasSaoPaulo(Number(dias)));
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

    const vendas = await buscarTodasVendasSaipos({ inicio, fim, pageSize: 200 });
    let falhas = 0;

    // ===============================
    // PROCESSAMENTO COM O MOTOR ÚNICO
    // ===============================
    for (const venda of vendas) {
      try {
        await processarVenda(venda);
      } catch (error: unknown) {
        falhas += 1;
        await registrarLog(
          "erro_processamento_historico",
          error instanceof Error ? error.message : 'Erro desconhecido ao processar venda historica',
          undefined,
          Number.isSafeInteger(Number(venda?.id_sale)) ? Number(venda.id_sale) : undefined,
          Number(venda?.total_amount || 0)
        );
      }
    }

    return NextResponse.json({
      sucesso: true,
      vendas_recebidas: vendas.length,
      falhas,
      periodo: { inicio, fim }
    });

  } catch (e: unknown) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      {
        erro: mensagem,
        ...(e instanceof SaiposApiError ? { tentativas: e.tentativas } : {}),
      },
      { status: e instanceof SaiposApiError ? e.status : 500 }
    );
  }
}
