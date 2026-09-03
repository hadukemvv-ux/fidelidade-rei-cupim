import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buscarVendasSaipos, SaiposApiError } from '@/lib/saipos';
import { processarVenda } from './processarVenda'; // MOTOR ÚNICO

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

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

    const vendas = await buscarVendasSaipos({ inicio, fim, limit: 200 });
    let falhas = 0;

    // 🔥 USANDO O MOTOR ÚNICO
    for (const venda of vendas) {
      try {
        await processarVenda(venda);
      } catch (error: unknown) {
        falhas += 1;
        await registrarLog(
          "erro_processamento",
          error instanceof Error ? error.message : "Erro desconhecido ao processar venda",
          undefined,
          Number.isSafeInteger(Number(venda?.id_sale)) ? Number(venda.id_sale) : undefined,
          Number(venda?.total_amount || 0)
        );
      }
    }

    return NextResponse.json({
      sucesso: true,
      processadas: vendas.length,
      falhas,
    });

  } catch (e: unknown) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido';
    await registrarLog("erro_fatal", mensagem);
    return NextResponse.json(
      {
        erro: mensagem,
        ...(e instanceof SaiposApiError ? { tentativas: e.tentativas } : {}),
      },
      { status: e instanceof SaiposApiError ? e.status : 500 }
    );
  }
}
