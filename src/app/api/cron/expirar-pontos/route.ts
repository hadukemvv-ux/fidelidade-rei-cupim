import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

const CRON_SECRET = process.env.CRON_SECRET || process.env.SAIPOS_SECRET || null;

const DIAS_ALERTA_30 = 30;
// Data de corte: Hoje menos 30 dias. Quem comprou ANTES disso, entra na lista.
function getDataCorte() {
    const data = new Date();
    data.setDate(data.getDate() - DIAS_ALERTA_30);
    return data.toISOString();
}

function diasSemCompra(ultimaCompra: string): number {
  const diffMs = new Date().getTime() - new Date(ultimaCompra).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function rebaixarNivel(nivelAtual: string): string {
    if (nivelAtual === 'REI_DO_CUPIM') return 'OURO';
    if (nivelAtual === 'OURO') return 'PRATA';
    return 'BRONZE';
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') 
             || request.nextUrl.searchParams.get('token');
  
  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resultados: any[] = [];

  try {
    // 🔥 O PULO DO GATO: Filtra direto no banco!
    // "Traga apenas quem comprou ANTES de 30 dias atrás"
    const dataCorte = getDataCorte();
    
    const { data: clientesAlvo, error } = await supabase
      .from('base_clientes_saipos')
      .select('id, telefone, nome, ultima_compra, nivel, pontos, cashback, tickets')
      .lte('ultima_compra', dataCorte); // Less Than or Equal (Menor ou igual a 30 dias atrás)

    if (error) throw error;
    
    if (!clientesAlvo || clientesAlvo.length === 0) {
        return NextResponse.json({ 
            message: 'Ninguém para expirar hoje.', 
            data_corte_usada: dataCorte
        });
    }

    // Processa apenas os "infratores"
    for (const cliente of clientesAlvo) {
        const dias = diasSemCompra(cliente.ultima_compra);
        
        // Dupla checagem (segurança)
        if (dias < 30) continue;

        let novosPontos = cliente.pontos;
        let novoCashback = cliente.cashback;
        let novosTickets = cliente.tickets;
        let novoNivel = cliente.nivel;
        let acao = '';

        // Regra 60 Dias (Morte)
        if (dias >= 60) {
            // Se já está zerado, ignora pra não gastar update
            if (cliente.pontos === 0 && cliente.cashback === 0 && cliente.nivel === 'BRONZE') continue;
            
            novosPontos = 0;
            novoCashback = 0;
            novosTickets = 0;
            novoNivel = 'BRONZE';
            acao = 'ZEROU TUDO (60+ dias)';
        } 
        // Regra 30 Dias (Punição)
        else {
            // Se já foi punido hoje (ex: rodou cron 2x), devíamos ignorar. 
            // Mas como não temos flag de "punido", vamos aplicar. 
            // CUIDADO: Rodar esse cron várias vezes no mesmo dia vai punir o cara repetidamente!
            // SOLUÇÃO IDEAL FUTURA: Criar campo "ultima_punicao" no banco.
            
            const fator = 0.7;
            novosPontos = Math.floor(cliente.pontos * fator);
            novoCashback = Number((cliente.cashback * fator).toFixed(2));
            novosTickets = Math.floor(cliente.tickets * fator);
            novoNivel = rebaixarNivel(cliente.nivel);
            acao = 'Punição 30% + Rebaixamento';
        }

        if (acao) {
            await supabase.from('base_clientes_saipos').update({
                pontos: novosPontos,
                cashback: novoCashback,
                tickets: novosTickets,
                nivel: novoNivel,
            }).eq('id', cliente.id);

            // Log
            await supabase.from('extrato_pontos').insert({
                cliente_id: cliente.telefone,
                tipo: 'saida',
                valor: cliente.pontos - novosPontos,
                motivo: 'Expiração por Inatividade',
                detalhes: `${acao} - ${dias} dias sem comprar.`,
                metodo: 'cron_job'
            });

            resultados.push({ telefone: cliente.telefone, dias, acao });
        }
    }

    return NextResponse.json({
      success: true,
      encontrados_vencidos: clientesAlvo.length,
      processados_com_acao: resultados.length,
      detalhes: resultados
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}