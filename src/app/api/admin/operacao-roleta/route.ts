import { NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

type Comanda = {
  criado_por: string | null;
  criado_por_nome: string | null;
  status: string;
  reconciliacao_status: string;
  valor_confirmado: number | null;
  nivel_roleta: number | null;
};

function situacaoDoOperador(divergentes: number, pendentes: number) {
  const indiceAtencao = divergentes * 3 + pendentes;
  return {
    indice_atencao: indiceAtencao,
    situacao: indiceAtencao >= 6 ? 'atenção' : indiceAtencao >= 2 ? 'acompanhar' : 'normal',
  };
}

/** Relatório sem dados de clientes: acompanha apenas a qualidade operacional. */
export async function GET(request: Request) {
  const actor = await requireOperationalActor(request, 'gestor');
  if (actor instanceof NextResponse) return actor;
  const data = new URL(request.url).searchParams.get('data') || hojeSaoPaulo();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });

  const { data: rows, error } = await supabaseAdmin.from('comandas_roleta')
    .select('criado_por, criado_por_nome, status, reconciliacao_status, valor_confirmado, nivel_roleta')
    .eq('data_operacional', data).is('apagada_em', null).limit(500);
  if (error) return NextResponse.json({ error: 'Não foi possível montar o relatório operacional.' }, { status: 500 });

  const comandas = (rows || []) as Comanda[];
  const total = comandas.length;
  const compativeis = comandas.filter((item) => item.reconciliacao_status === 'compativel').length;
  const divergentes = comandas.filter((item) => item.reconciliacao_status === 'divergente').length;
  const pendentes = comandas.filter((item) => item.reconciliacao_status === 'pendente' || item.reconciliacao_status === 'nao_localizada').length;
  const qrsEmitidos = comandas.filter((item) => ['qr_emitido', 'reconciliada', 'divergente'].includes(item.status)).length;
  const porNivel = [1, 2, 3, 4, 5].map((nivel) => ({ nivel, quantidade: comandas.filter((item) => item.nivel_roleta === nivel).length }));
  const agrupado = new Map<string, { nome: string; total: number; qrs_emitidos: number; compativeis: number; divergentes: number; pendentes: number }>();
  for (const item of comandas) {
    const chave = item.criado_por || item.criado_por_nome || 'sem-responsável';
    const atual = agrupado.get(chave) || { nome: item.criado_por_nome || 'Sem responsável', total: 0, qrs_emitidos: 0, compativeis: 0, divergentes: 0, pendentes: 0 };
    atual.total += 1;
    if (['qr_emitido', 'reconciliada', 'divergente'].includes(item.status)) atual.qrs_emitidos += 1;
    if (item.reconciliacao_status === 'compativel') atual.compativeis += 1;
    if (item.reconciliacao_status === 'divergente') atual.divergentes += 1;
    if (item.reconciliacao_status === 'pendente' || item.reconciliacao_status === 'nao_localizada') atual.pendentes += 1;
    agrupado.set(chave, atual);
  }
  const operadores = [...agrupado.values()].map((item) => ({ ...item, ...situacaoDoOperador(item.divergentes, item.pendentes) })).sort((a, b) => b.indice_atencao - a.indice_atencao || b.total - a.total);
  return NextResponse.json({
    data, resumo: { total, qrs_emitidos: qrsEmitidos, compativeis, divergentes, pendentes }, por_nivel: porNivel, operadores,
    observacao: 'O índice de atenção é somente um sinal para revisão: não bloqueia, pune ou altera benefícios automaticamente.',
  });
}
