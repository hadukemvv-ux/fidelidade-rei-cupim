import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sorteios')
    .select('*')
    .eq('status', 'ativo')
    .order('data_sorteio', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar sorteio.' }, { status: 500 });
  }

  return NextResponse.json({ sorteio: data || null });
}