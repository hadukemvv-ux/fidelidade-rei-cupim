import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { senha } = await req.json();

    if (!senha || senha.length !== 4) {
      return NextResponse.json({ error: 'Senha inválida (use 4 dígitos).' }, { status: 400 });
    }

    const prefixo = senha.substring(0, 2);
    const sufixo = parseInt(senha.substring(2, 4));

    if (![1, 2, 3].includes(sufixo)) {
        return NextResponse.json({ error: 'Nível inválido (Final deve ser 01, 02 ou 03).' }, { status: 400 });
    }

    // Busca nome do garçom
    const { data: garcom } = await supabaseAdmin
        .from('garcons')
        .select('nome')
        .eq('codigo_prefixo', prefixo)
        .eq('ativo', true)
        .single();

    if (!garcom) {
        return NextResponse.json({ error: 'Garçom não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ 
        nome: garcom.nome, 
        nivel: sufixo,
        nivel_texto: sufixo === 3 ? 'OURO (+R$ 300)' : sufixo === 2 ? 'PRATA (+R$ 200)' : 'BRONZE (+R$ 100)'
    });

  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}