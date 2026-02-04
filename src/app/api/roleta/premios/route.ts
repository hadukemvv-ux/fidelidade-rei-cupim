import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // Garante que não faça cache

export async function GET() {
  try {
    // 1. Busca prêmios ativos ordenados por ID (para manter a posição na roda)
    const { data: premios, error } = await supabaseAdmin
      .from('premios_roleta')
      .select('*')
      .eq('ativo', true)
      .order('id', { ascending: true });

    if (error) {
      console.error("Erro Supabase:", error);
      throw error;
    }

    // 2. Se não tiver nada, retorna array vazio (o front avisa)
    return NextResponse.json(premios || []);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar prêmios.' }, { status: 500 });
  }
}