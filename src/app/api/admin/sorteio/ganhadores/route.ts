import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sorteios_ganhadores')
      .select('id, sorteio_id, cliente_id, nome_cliente, telefone_cliente, tickets_no_sorteio, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200); // proteção para listas enormes

    if (error) {
      console.error('[GET /ganhadores] Erro ->', error);
      return NextResponse.json(
        { error: 'Erro ao buscar ganhadores.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      ganhadores: data || []
    });

  } catch (err: any) {
    console.error('[GET /ganhadores] Exception ->', err);
    return NextResponse.json(
      { error: err.message || 'Erro inesperado ao buscar ganhadores.' },
      { status: 500 }
    );
  }
}