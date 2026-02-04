import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('produtos_loja')
      .select('id, nome, descricao, imagem_url, custo_em_pontos, categoria, destaque, ativo')
      .eq('ativo', true)
      .order('destaque', { ascending: false })
      .order('custo_em_pontos', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      produtos: data || []
    });

  } catch (err: any) {
    console.error('[GET /produtos] ERROR:', err);
    return NextResponse.json(
      { ok: false, error: 'Erro ao carregar produtos.' },
      { status: 500 }
    );
  }
}