import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // Garante que não faça cache estático

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
        .from('garcons')
        .select('*')
        .eq('ativo', true)
        .order('total_giros', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validação básica
    if (!body.nome || !body.codigo_prefixo) {
        return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('garcons')
        .insert({ 
            nome: body.nome, 
            codigo_prefixo: body.codigo_prefixo, 
            total_giros: 0,
            ativo: true // Força o ativo
        })
        .select()
        .single();
        
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro POST garcom:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    const { error } = await supabaseAdmin
        .from('garcons')
        .update({ 
            nome: body.nome, 
            codigo_prefixo: body.codigo_prefixo 
        })
        .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}