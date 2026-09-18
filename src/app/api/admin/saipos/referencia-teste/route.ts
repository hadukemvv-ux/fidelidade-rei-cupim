import { NextRequest, NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function textoSeguro(value: unknown, limite = 80) {
  return typeof value === 'string' && value.length <= limite ? value : null;
}

function numeroSeguro(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) && numero >= 0 && numero <= 100000 ? numero : null;
}

/** Expõe apenas a referência técnica aprovada para o piloto, nunca dados da venda. */
export async function GET(request: NextRequest) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof NextResponse) return actor;

  const { data, error } = await supabaseAdmin
    .from('administracao_eventos')
    .select('criado_em, detalhes')
    .eq('entidade', 'comanda')
    .eq('entidade_id', 'saipos-piloto-mesa-99')
    .eq('acao', 'referencia_teste_saipos_registrada')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Não foi possível carregar a referência de teste.' }, { status: 500 });
  if (!data || !data.detalhes || typeof data.detalhes !== 'object' || Array.isArray(data.detalhes)) {
    return NextResponse.json({ referencia: null });
  }

  const detalhes = data.detalhes as Record<string, unknown>;
  return NextResponse.json({
    referencia: {
      id_pedido_impresso: textoSeguro(detalhes.id_pedido_impresso, 30),
      mesa_referencia: textoSeguro(detalhes.mesa_referencia, 20),
      data_operacional: textoSeguro(detalhes.data_operacional, 10),
      valor_esperado: numeroSeguro(detalhes.valor_esperado),
      situacao: textoSeguro(detalhes.situacao, 60),
      registrada_em: data.criado_em,
    },
  });
}
