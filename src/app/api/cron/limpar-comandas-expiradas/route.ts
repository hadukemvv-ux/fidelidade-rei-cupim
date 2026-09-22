import { NextRequest, NextResponse } from 'next/server';
import { caminhosDaComanda, RETENCAO_COMANDA_HORAS } from '@/lib/comandaRetention';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ComandaExpirada = { id: string; imagem_path: string };
type ImagemDaComanda = { comanda_id: string; imagem_path: string };

function autorizada(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization')?.trim() === `Bearer ${secret}`;
}

/**
 * Remove evidências privadas após a janela operacional do piloto. A linha
 * permanece auditável, mas os objetos deixam de existir no bucket privado.
 */
export async function GET(request: NextRequest) {
  if (!autorizada(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { data: comandas, error: comandasError } = await supabaseAdmin
    .from('comandas_roleta')
    .select('id, imagem_path')
    .is('apagada_em', null)
    .lte('expira_em', new Date().toISOString())
    .order('expira_em', { ascending: true })
    .limit(50);
  if (comandasError) return NextResponse.json({ error: 'Não foi possível localizar as imagens expiradas.' }, { status: 500 });
  if (!comandas?.length) return NextResponse.json({ ok: true, elegiveis: 0, apagadas: 0, falhas: 0 });

  const ids = (comandas as ComandaExpirada[]).map((comanda) => comanda.id);
  const { data: imagens, error: imagensError } = await supabaseAdmin
    .from('comanda_imagens')
    .select('comanda_id, imagem_path')
    .in('comanda_id', ids);
  if (imagensError) return NextResponse.json({ error: 'Não foi possível localizar os vínculos das imagens expiradas.' }, { status: 500 });

  const imagensPorComanda = new Map<string, Array<{ imagem_path: string }>>();
  for (const imagem of (imagens || []) as ImagemDaComanda[]) {
    const lista = imagensPorComanda.get(imagem.comanda_id) || [];
    lista.push({ imagem_path: imagem.imagem_path });
    imagensPorComanda.set(imagem.comanda_id, lista);
  }

  let apagadas = 0;
  let falhas = 0;
  let imagensRemovidas = 0;
  for (const comanda of comandas as ComandaExpirada[]) {
    const paths = caminhosDaComanda(comanda.imagem_path, imagensPorComanda.get(comanda.id));
    const { error: storageError } = await supabaseAdmin.storage.from('comandas-roleta').remove(paths);
    if (storageError) {
      falhas += 1;
      continue;
    }

    const apagadaEm = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('comandas_roleta')
      .update({ apagada_em: apagadaEm })
      .eq('id', comanda.id)
      .is('apagada_em', null);
    if (updateError) {
      falhas += 1;
      continue;
    }

    apagadas += 1;
    imagensRemovidas += paths.length;
    await supabaseAdmin.from('administracao_eventos').insert({
      entidade: 'comanda', entidade_id: comanda.id, acao: 'imagens_expiradas_removidas',
      detalhes: { imagens_removidas: paths.length, retencao_horas: RETENCAO_COMANDA_HORAS, apagada_em: apagadaEm },
    });
  }

  return NextResponse.json({ ok: falhas === 0, elegiveis: comandas.length, apagadas, imagens_removidas: imagensRemovidas, falhas }, { status: falhas ? 500 : 200 });
}
