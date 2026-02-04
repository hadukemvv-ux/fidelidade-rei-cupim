import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
  // Zera a coluna 'total_giros' de TODOS os garçons
  // O histórico detalhado (quem ganhou o que) continua salvo na tabela 'historico_roleta'
  // Aqui zeramos apenas o PLACAR do mês.
  
  const { error } = await supabaseAdmin
    .from('garcons')
    .update({ total_giros: 0 })
    .neq('id', 0); // Update sem where é perigoso, esse neq(0) é só pra travar o update all de forma segura

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}