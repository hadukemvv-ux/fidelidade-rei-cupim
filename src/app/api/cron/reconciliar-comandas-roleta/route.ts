import { NextRequest, NextResponse } from 'next/server';
import { buscarTodasVendasSaipos, periodoUltimosDiasSaoPaulo, SaiposApiError, type VendaSaipos } from '@/lib/saipos';
import { compararComandaComVenda } from '@/lib/reconciliacaoComanda';
import { diasDeConsultaParaPendencias } from '@/lib/reconciliacaoJanela';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ComandaPendente = {
  id: string;
  id_pedido_impresso: string;
  valor_confirmado: number;
  nivel_roleta: number | null;
  criado_em: string;
};

function autorizada(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization')?.trim();
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

function idDaVenda(venda: VendaSaipos) {
  return venda.id_sale === undefined || venda.id_sale === null ? '' : String(venda.id_sale).trim();
}

/**
 * Reconcilia somente comandas que já emitiram QR no piloto. Nunca cria
 * clientes, pontos, cupons, prêmios ou sanções; divergência vira auditoria.
 */
export async function GET(request: NextRequest) {
  if (!autorizada(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;

  const { data: comandas, error: comandasError } = await supabaseAdmin
    .from('comandas_roleta')
    .select('id, id_pedido_impresso, valor_confirmado, nivel_roleta, criado_em')
    .eq('status', 'qr_emitido')
    .eq('reconciliacao_status', 'pendente')
    .not('id_pedido_impresso', 'is', null)
    .not('valor_confirmado', 'is', null)
    .order('criado_em', { ascending: true })
    .limit(100);
  if (comandasError) return NextResponse.json({ error: 'Não foi possível carregar as comandas pendentes.' }, { status: 500 });
  if (!comandas?.length) return NextResponse.json({ ok: true, processadas: 0, compativeis: 0, divergentes: 0, pendentes: 0 });

  try {
    // A janela cresce até a pendência mais antiga (teto de 90 dias). Assim,
    // ficar uma semana sem abrir o painel não faz a venda sair da conferência.
    const diasDeConsulta = diasDeConsultaParaPendencias((comandas as ComandaPendente[]).map((comanda) => comanda.criado_em));
    const { inicio, fim } = periodoUltimosDiasSaoPaulo(diasDeConsulta);
    const vendas = await buscarTodasVendasSaipos({
      inicio, fim, dateColumnFilter: 'updated_at', pageSize: 200, maxPages: 5,
    });
    const porId = new Map(vendas.map((venda) => [idDaVenda(venda), venda]));
    let compativeis = 0;
    let divergentes = 0;
    let pendentes = 0;

    for (const comanda of comandas as ComandaPendente[]) {
      const resultado = compararComandaComVenda(comanda.id_pedido_impresso, Number(comanda.valor_confirmado), porId.get(comanda.id_pedido_impresso), comanda.nivel_roleta);
      if (!resultado) {
        pendentes += 1;
        continue;
      }
      const status = resultado.compativel ? 'reconciliada' : 'divergente';
      const reconciliacaoStatus = resultado.compativel ? 'compativel' : 'divergente';
      const { data: atualizada, error: updateError } = await supabaseAdmin
        .from('comandas_roleta')
        .update({
          status,
          saipos_sale_id: resultado.detalhes.id_sale,
          reconciliacao_status: reconciliacaoStatus,
          reconciliada_em: new Date().toISOString(),
          reconciliacao_detalhes: { ...resultado.detalhes, motivo: resultado.motivo, origem: 'cron_diario' },
        })
        .eq('id', comanda.id)
        .eq('reconciliacao_status', 'pendente')
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!atualizada) continue;
      if (resultado.compativel) compativeis += 1; else divergentes += 1;
      await supabaseAdmin.from('administracao_eventos').insert({
        entidade: 'comanda', entidade_id: comanda.id,
        acao: resultado.compativel ? 'reconciliacao_saipos_compativel' : 'reconciliacao_saipos_divergente',
        detalhes: { id_pedido_impresso: comanda.id_pedido_impresso, ...resultado.detalhes, motivo: resultado.motivo },
      });
    }

    await supabaseAdmin.from('administracao_eventos').insert({
      entidade: 'comanda', entidade_id: `rotina-${new Date().toISOString().slice(0, 10)}`,
      acao: 'reconciliacao_saipos_rotina_diaria',
      detalhes: { processadas: comandas.length, compativeis, divergentes, pendentes, dias_consulta_saipos: diasDeConsulta, origem: 'cron_diario' },
    });

    return NextResponse.json({ ok: true, processadas: comandas.length, compativeis, divergentes, pendentes, dias_consulta_saipos: diasDeConsulta });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro inesperado.';
    return NextResponse.json({ error: 'A reconciliação não foi concluída.', detalhe: mensagem }, {
      status: error instanceof SaiposApiError ? 502 : 500,
    });
  }
}
