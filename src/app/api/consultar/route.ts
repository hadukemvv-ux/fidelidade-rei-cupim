import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Config Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para calcular o nível baseado nos pontos qualificáveis
function calcularNivel(pontos: number): string {
  if (pontos >= 4300) {
    return 'Rei do Cupim';
  }
  if (pontos >= 1200) {
    return 'Ouro';
  }
  if (pontos >= 250) {
    return 'Prata';
  }
  return 'Bronze';
}

// GET /api/consultar?telefone=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telefone = searchParams.get('telefone')?.replace(/\D/g, '').trim();

    if (!telefone) {
      return NextResponse.json({ error: 'Parâmetro "telefone" é obrigatório.' }, { status: 400 });
    }

    if (telefone.length < 10) {
      return NextResponse.json({ error: 'Telefone deve ter pelo menos 10 dígitos.' }, { status: 400 });
    }

    // Busca nas tabelas - agora inclui pontos_qualificaveis
    const [resPontos, resCashback, resTickets] = await Promise.all([
      supabase.from('pontos').select('nivel, total, pontos_qualificaveis').eq('telefone', telefone).maybeSingle(),
      supabase.from('cashback').select('saldo').eq('telefone', telefone).maybeSingle(),
      supabase.from('tickets').select('quantidade').eq('telefone', telefone).maybeSingle(),
    ]);

    if (resPontos.error || resCashback.error || resTickets.error) {
      console.error('Erro Supabase:', resPontos.error, resCashback.error, resTickets.error);
      return NextResponse.json({ error: 'Erro ao consultar banco de dados.' }, { status: 500 });
    }

    const encontrouAlgo = resPontos.data || resCashback.data || resTickets.data;

    if (!encontrouAlgo) {
      return NextResponse.json({ error: 'Telefone não encontrado.' }, { status: 404 });
    }

    // ALTERAÇÃO: usa pontos_qualificaveis para calcular nível (não diminui com resgate ou perda parcial)
    const pontosQualificaveis = resPontos.data?.pontos_qualificaveis ?? resPontos.data?.total ?? 0;
    const nivelCalculado = calcularNivel(pontosQualificaveis);

    // Retorna os dados
    return NextResponse.json({
      telefone,
      nivel: nivelCalculado,  // nível congelado
      pontos: resPontos.data?.total ?? 0,  // saldo atual (pode ter diminuído)
      cashback: resCashback.data?.saldo ?? 0,
      tickets: resTickets.data?.quantidade ?? 0,
    });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}