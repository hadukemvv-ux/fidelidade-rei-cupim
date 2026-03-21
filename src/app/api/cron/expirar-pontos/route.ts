import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const CRON_SECRET = process.env.CRON_SECRET;

const DIAS_ALERTA_30 = 30;

function getDataCorte() {
    const data = new Date();
    data.setDate(data.getDate() - DIAS_ALERTA_30);
    return data.toISOString();
}

function diasSemCompra(ultimaCompra: string): number {
  const diffMs = new Date().getTime() - new Date(ultimaCompra).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function rebaixarNivel(nivelAtual: string): string {
    const n = nivelAtual.toUpperCase();
    if (n === 'REI')  return 'ouro';
    if (n === 'OURO') return 'prata';
    return 'bronze';
}

/**
 * Cron endpoint para expirar/penalizar clientes inativos
 *
 * Regras:
 * - 30-59 dias sem compra: Reduz 30% dos pontos/cashback/tickets + rebaixa nível
 * - 60+ dias sem compra: Zera tudo e rebaixa para BRONZE
 *
 * IMPORTANTE: Deve ser executado UMA VEZ por dia apenas!
 * Usa batch updates para evitar N+1 (suporta milhares de clientes).
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
             || request.nextUrl.searchParams.get('token');

  if (!CRON_SECRET) {
    return NextResponse.json({
      error: 'CRON_SECRET não configurado no .env.'
    }, { status: 500 });
  }

  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const dataCorte = getDataCorte();
    const agora = new Date().toISOString();

    const { data: clientesAlvo, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone, nome, ultima_compra, nivel, pontos, cashback, tickets')
      .lte('ultima_compra', dataCorte);

    if (error) throw error;

    if (!clientesAlvo || clientesAlvo.length === 0) {
      return NextResponse.json({
        message: 'Ninguém para expirar hoje.',
        data_corte_usada: dataCorte
      });
    }

    // Separar em dois grupos
    const grupoZerar: number[] = [];   // 60+ dias
    const grupoPunir: typeof clientesAlvo = []; // 30-59 dias
    const logs: object[] = [];

    for (const cliente of clientesAlvo) {
      const dias = diasSemCompra(cliente.ultima_compra);
      if (dias < 30) continue;

      if (dias >= 60) {
        if (cliente.pontos === 0 && cliente.cashback === 0 && cliente.nivel.toLowerCase() === 'bronze') continue;
        grupoZerar.push(cliente.id);
        logs.push({
          cliente_id: cliente.id,
          tipo: 'expiração',
          pontos: cliente.pontos,
          cashback: cliente.cashback,
          descricao: `ZEROU TUDO (${dias} dias sem comprar)`,
          criado_em: agora,
        });
      } else {
        grupoPunir.push(cliente);
        const novosPontos = Math.floor(cliente.pontos * 0.7);
        logs.push({
          cliente_id: cliente.id,
          tipo: 'expiração',
          pontos: cliente.pontos - novosPontos,
          cashback: Number((cliente.cashback * 0.3).toFixed(2)),
          descricao: `Punição 30% + Rebaixamento (${dias} dias sem comprar)`,
          criado_em: agora,
        });
      }
    }

    // ── Batch update grupo A: ZERAR (1 chamada) ────────────────────────────
    if (grupoZerar.length > 0) {
      const { error: errZerar } = await supabaseAdmin
        .from('base_clientes_saipos')
        .update({ nivel: 'bronze', pontos: 0, cashback: 0, tickets: 0, atualizado_em: agora })
        .in('id', grupoZerar);
      if (errZerar) console.error('Erro batch zerar:', errZerar.message);
    }

    // ── Parallel updates grupo B: PUNIR (1 Promise.all por chunk de 50) ───
    const CHUNK = 50;
    for (let i = 0; i < grupoPunir.length; i += CHUNK) {
      await Promise.allSettled(
        grupoPunir.slice(i, i + CHUNK).map(c =>
          supabaseAdmin.from('base_clientes_saipos').update({
            nivel: rebaixarNivel(c.nivel),
            pontos: Math.floor(c.pontos * 0.7),
            cashback: Number((c.cashback * 0.7).toFixed(2)),
            tickets: Math.floor(c.tickets * 0.7),
            atualizado_em: agora,
          }).eq('id', c.id)
        )
      );
    }

    // ── Bulk insert de logs (1 chamada) ─────────────────────────────────────
    if (logs.length > 0) {
      try {
        await supabaseAdmin.from('extrato_pontos').insert(logs);
      } catch {
        console.log('Tabela extrato_pontos não existe, pulando logs');
      }
    }

    return NextResponse.json({
      success: true,
      data_corte_usada: dataCorte,
      encontrados_vencidos: clientesAlvo.length,
      zerados: grupoZerar.length,
      punidos: grupoPunir.length,
      execute_once_per_day: '⚠️ Este cron deve executar UMA ÚNICA VEZ por dia',
    });

  } catch (err: any) {
    console.error('Erro em expirar-pontos cron:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
