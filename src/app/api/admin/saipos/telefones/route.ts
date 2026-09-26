import { NextRequest, NextResponse } from 'next/server';
import { requireOperationalActor } from '@/lib/operationalAuth';
import { buscarTodasVendasSaipos, periodoDiaSaoPaulo, SaiposApiError } from '@/lib/saipos';
import { auditarTelefonesSaipos } from '@/lib/saiposPhoneAudit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Diagnóstico restrito à gestão: consulta a Saipos, mas devolve só contagens. */
export async function GET(request: NextRequest) {
  const actor = await requireOperationalActor(request, 'superadmin');
  if (actor instanceof NextResponse) return actor;

  const dia = new URL(request.url).searchParams.get('dia') || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  try {
    const { inicio, fim } = periodoDiaSaoPaulo(dia);
    const vendas = await buscarTodasVendasSaipos({
      inicio, fim, dateColumnFilter: 'created_at', pageSize: 500, maxPages: 4,
    });
    return NextResponse.json({
      ok: true,
      modo: 'somente_leitura',
      dia,
      ...auditarTelefonesSaipos(vendas),
      observacao: 'Telefone com DDD não comprova canal próprio. Repetição pode ser cliente recorrente ou número padrão de integração.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SaiposApiError) {
      return NextResponse.json({ error: 'A Saipos não concluiu a consulta.', status_fornecedor: error.status }, { status: 502 });
    }
    if (error instanceof Error && error.message === 'Token da API de Dados Saipos não configurado.') {
      return NextResponse.json({ error: 'Conexão Saipos não configurada no servidor.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Não foi possível analisar os telefones.' }, { status: 400 });
  }
}
