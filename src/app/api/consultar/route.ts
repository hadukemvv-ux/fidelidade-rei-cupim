import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------
// Configuração do Supabase (lado servidor)
// --------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// --------------------------------------------------
// GET /api/consultar?telefone=559199999999
// --------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // Pega o telefone da URL
    const { searchParams } = new URL(request.url);
    const telefone = searchParams.get('telefone')?.replace(/\D/g, '').trim();

    // Validação
    if (!telefone) {
      return NextResponse.json(
        { error: 'Parâmetro "telefone" é obrigatório.' },
        { status: 400 }
      );
    }

    if (telefone.length < 10) {
      return NextResponse.json(
        { error: 'Telefone deve ter pelo menos 10 dígitos.' },
        { status: 400 }
      );
    }

    // Busca simultânea nas três tabelas
    const [resPontos, resCashback, resTickets] = await Promise.all([
      supabase.from('pontos').select('nivel,total').eq('telefone', telefone).maybeSingle(),
      supabase.from('cashback').select('saldo').eq('telefone', telefone).maybeSingle(),
      supabase.from('tickets').select('quantidade').eq('telefone', telefone).maybeSingle(),
    ]);

    // Verifica erros de conexão
    if (resPontos.error || resCashback.error || resTickets.error) {
      console.error('Erro Supabase:', resPontos.error, resCashback.error, resTickets.error);
      return NextResponse.json(
        { error: 'Erro ao consultar banco de dados.' },
        { status: 500 }
      );
    }

    // Verifica se encontrou algo
    const encontrouAlgo = resPontos.data || resCashback.data || resTickets.data;

    if (!encontrouAlgo) {
      return NextResponse.json(
        { error: 'Telefone não encontrado.' },
        { status: 404 }
      );
    }

    // Retorna os dados
    return NextResponse.json({
      telefone,
      nivel: resPontos.data?.nivel ?? '—',
      pontos: resPontos.data?.total ?? 0,
      cashback: resCashback.data?.saldo ?? 0,
      tickets: resTickets.data?.quantidade ?? 0,
    });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
