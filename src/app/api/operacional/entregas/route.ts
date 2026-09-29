import { NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { bloquearSeContencaoAtiva } from '@/lib/operationalContainment';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deliveryLedgerEnabled, type DeliveryRecord } from '@/lib/prizeDeliveryLedger';
import { changeDelivery, deliveryIdBatches, listDeliveries, type DeliveryStore } from '@/lib/prizeDeliveryHandlers';

export const dynamic = 'force-dynamic';

const store: DeliveryStore = {
  async list(actor) {
    let query = supabaseAdmin.from('entregas_premios').select('id,operador_id,modo_teste,status,versao,criado_em,entregue_em,lancado_em,produto_id,produto_nome,unidade,quantidade').order('criado_em', { ascending: false }).limit(501);
    const recent = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    query = query.or(`lancado_em.is.null,lancado_em.gte.${recent}`);
    if (actor.papel === 'garcom') query = query.eq('operador_id', actor.userId);
    const { data, error } = await query;
    // Não apresentar fechamento parcial como se fosse completo.
    if (error || (data?.length ?? 0) > 500) throw new Error('Consulta indisponível ou exige paginação.');
    return (data ?? []) as DeliveryRecord[];
  },
  async options(deliveryIds) {
    const rows = [];
    for (const ids of deliveryIdBatches(deliveryIds)) {
      const { data, error } = await supabaseAdmin.from('entregas_opcoes')
        .select('entrega_id,produto_id,entregas_produtos!inner(nome,unidade,ativo)')
        .in('entrega_id', ids).eq('entregas_produtos.ativo', true).limit(5001);
      if (error || (data?.length ?? 0) > 5000) throw new Error('Opções indisponíveis.');
      rows.push(...(data ?? []));
      if (rows.length > 5000) throw new Error('Opções indisponíveis.');
    }
    return rows.map((row) => {
      const product = Array.isArray(row.entregas_produtos) ? row.entregas_produtos[0] : row.entregas_produtos;
      return { entrega_id: row.entrega_id, produto_id: row.produto_id, nome: product.nome, unidade: product.unidade };
    });
  },
  async mutate(input) {
    const { data, error } = await supabaseAdmin.rpc('registrar_entrega_premio', {
      p_entrega_id: input.entregaId, p_actor_id: input.actor.userId,
      p_acao: input.acao, p_versao: input.versao, p_produto_id: input.produtoId ?? null,
    });
    if (error || !data) throw new Error('Mutação indisponível.');
    return data;
  },
};

async function actorFor(request: Request) {
  if (!deliveryLedgerEnabled(process.env)) return NextResponse.json({ error: 'Registro de entregas ainda não habilitado.' }, { status: 503 });
  const blocked = await bloquearSeContencaoAtiva();
  if (blocked) return blocked;
  return requireOperationalActor(request, 'garcom');
}

export async function GET(request: Request) {
  const actor = await actorFor(request);
  if (actor instanceof NextResponse) return actor;
  return listDeliveries(actor, store);
}

export async function POST(request: Request) {
  const actor = await actorFor(request);
  if (actor instanceof NextResponse) return actor;
  return changeDelivery(request, actor, store);
}
