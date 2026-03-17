import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const CRON_SECRET = process.env.CRON_SECRET;

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
    if (nivelAtual === 'REI') return 'OURO';
    if (nivelAtual === 'OURO') return 'PRATA';
    return 'BRONZE';
}

/**
 * Cron endpoint para expirar/penalizar clientes inativos
 * 
 * Regras:
 * - 30-59 dias sem compra: Reduz 30% dos pontos/cashback/tickets + rebaixa de nível
 * - 60+ dias sem compra: Zera tudo e rebaixa para BRONZE
 * 
 * IMPORTANTE: Deve ser executado UMA VEZ por dia apenas!
 * 
 * Proteção: Requer token CRON_SECRET via header Authorization ou query param token
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') 
             || request.nextUrl.searchParams.get('token');
  
  // ⚠️ Token é OBRIGATÓRIO
  if (!CRON_SECRET) {
    return NextResponse.json({ 
      error: 'CRON_SECRET não configurado no .env. Configure para proteger este endpoint.' 
    }, { status: 500 });
  }
  
  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resultados: any[] = [];

  try {
    const dataCorte = getDataCorte();
    
    const { data: clientesAlvo, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone, nome, ultima_compra, nivel, pontos, cashback, tickets')
      .lte('ultima_compra', dataCorte);

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
            // TODO: Implementar campo "ultima_punicao" na tabela base_clientes_saipos
            // Isso evitará múltiplas punições se o cron rodar mais de uma vez no mesmo dia
            
            const fator = 0.7;
            novosPontos = Math.floor(cliente.pontos * fator);
            novoCashback = Number((cliente.cashback * fator).toFixed(2));
            novosTickets = Math.floor(cliente.tickets * fator);
            novoNivel = rebaixarNivel(cliente.nivel);
            acao = 'Punição 30% + Rebaixamento';
        }

        if (acao) {
            // Atualizar cliente
            await supabaseAdmin.from('base_clientes_saipos').update({
                pontos: novosPontos,
                cashback: novoCashback,
                tickets: novosTickets,
                nivel: novoNivel,
                atualizado_em: new Date().toISOString(),
            }).eq('id', cliente.id);

            // Log na tabela extrato_pontos com cliente_id CORRETO (não telefone!)
            try {
              await supabaseAdmin.from('extrato_pontos').insert({
                  cliente_id: cliente.id,  // ✅ FIXO: Era cliente.telefone, agora é correto
                  tipo: 'expiração',
                  pontos: cliente.pontos - novosPontos,
                  cashback: cliente.cashback - novoCashback,
                  descricao: `${acao} - ${dias} dias sem comprar.`,
                  criado_em: new Date().toISOString(),
              });
            } catch (logErr) {
              console.log('Tabela extrato_pontos não existe ainda, pulando log detalhado');
            }

            resultados.push({ 
              telefone: cliente.telefone, 
              nome: cliente.nome,
              dias, 
              acao,
              novo_nivel: novoNivel,
              pontos_antes: cliente.pontos,
              pontos_depois: novosPontos
            });
        }
    }

    return NextResponse.json({
      success: true,
      encontrados_vencidos: clientesAlvo.length,
      processados_com_acao: resultados.length,
      detalhes: resultados,
      execute_once_per_day: '⚠️ Este cron deve executar UMA ÚNICA VEZ por dia',
    });

  } catch (err: any) {
    console.error('Erro em expirar-pontos cron:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}