import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getNivelPorGasto, calcularPontosEarned, calcularTicketsEarned, calcularCashbackValue } from '@/lib/fidelidade-rules';

// Token de segurança para garantir que só a Saipos chame essa rota
// ⚠️ IMPORTANTE: Sempre defina SAIPOS_TOKEN no seu .env.local ou variáveis do Vercel
const SECRET_TOKEN = process.env.SAIPOS_TOKEN;

if (!SECRET_TOKEN) {
  console.warn('⚠️ SAIPOS_TOKEN não definido. Webhook sem proteção.');
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  try {
    // 1. Verificação de Segurança (Header)
    const authHeader = req.headers.get('x-auth-token');
    if (!SECRET_TOKEN || authHeader !== SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // 2. Extração de Dados
    const telefoneBruto = body.customer_phone || body.telefone || '';
    const valorPedido = Number(body.order_total || body.valor_total || 0);
    const orderId = String(body.order_id || body.id_pedido || '');
    const idSale = Number(body.id_sale || body.sale_id || 0);

    // Se não tem valor, ignora
    if (valorPedido <= 0) {
      return NextResponse.json({ ok: false, message: 'Valor zerado, ignorado.' });
    }

    // 2.1 Idempotência: ignorar vendas já processadas pelo cron ou por retry do webhook
    if (idSale) {
      const { data: jaProcessado } = await supabaseAdmin
        .from('saipos_pedidos_processados')
        .select('id_sale')
        .eq('id_sale', idSale)
        .maybeSingle();

      if (jaProcessado) {
        return NextResponse.json({ ok: true, message: `Venda #${idSale} já processada anteriormente. Ignorado.` });
      }
    }

    // 3. Tratamento do Telefone
    const telefone = onlyDigits(telefoneBruto);

    // Se não tiver telefone válido
    if (!telefone || telefone.length < 10) {
      return NextResponse.json({ ok: true, message: 'Pedido sem telefone válido. Aguardando resgate manual (QR Code).' });
    }

    // 4. Buscar ou Criar Cliente na tabela principal
    let { data: cliente } = await supabaseAdmin.from('base_clientes_saipos').select('*').eq('telefone', telefone).maybeSingle();

    if (!cliente) {
      // Cliente novo vindo da Saipos! Criamos cadastro básico
      const { data: novoCliente, error: errCreate } = await supabaseAdmin.from('base_clientes_saipos').insert({
        telefone,
        nome: body.customer_name || 'Cliente Saipos',
        nivel: 'bronze',
        pontos: 0,
        cashback: 0,
        tickets: 0,
        total_gasto: 0,
        qtd_pedidos: 0,
        primeira_compra: nowIso(),
        ultima_compra: nowIso(),
      }).select().single();

      if (errCreate) throw errCreate;
      cliente = novoCliente;
    } else {
      // Atualiza última compra
      await supabaseAdmin.from('base_clientes_saipos').update({ ultima_compra: nowIso() }).eq('telefone', telefone);
    }

    // 5. Calcular pontos baseado na ESTRUTURA UNIFICADA
    const gastoAtual = Number(cliente.total_gasto || 0);
    const novoGasto = gastoAtual + valorPedido;
    
    const nivelInfo = getNivelPorGasto(novoGasto);
    const pontosGanhos = calcularPontosEarned(valorPedido, novoGasto);
    const cashbackGanho = calcularCashbackValue(valorPedido, novoGasto);
    const ticketsGanhos = calcularTicketsEarned(valorPedido, novoGasto);

    // 6. Atualizar cliente com novos saldos
    await supabaseAdmin.from('base_clientes_saipos').update({
      nivel: nivelInfo.nivel.toLowerCase(),
      pontos: (cliente.pontos || 0) + pontosGanhos,
      cashback: (cliente.cashback || 0) + cashbackGanho,
      tickets: (cliente.tickets || 0) + ticketsGanhos,
      total_gasto: novoGasto,
      qtd_pedidos: (cliente.qtd_pedidos || 0) + 1,
      ultima_compra: nowIso(),
      atualizado_em: nowIso(),
    }).eq('telefone', telefone);

    // 7. Marcar venda como processada (idempotência)
    if (idSale) {
      await supabaseAdmin.from('saipos_pedidos_processados').insert({ id_sale: idSale });
    }

    // 8. Registrar transação em extrato (se existir tabela)
    try {
      await supabaseAdmin.from('extrato_pontos').insert({
        cliente_id: cliente.id,
        tipo: 'VENDA_SAIPOS',
        pontos: pontosGanhos,
        cashback: cashbackGanho,
        tickets: ticketsGanhos,
        descricao: `Compra Saipos #${orderId} - R$ ${valorPedido.toFixed(2)}`,
        criado_em: nowIso(),
      });
    } catch (e) {
      // Se tabela não existe, ignora (compatibilidade)
      console.log('Tabela extrato_pontos não encontrada, pulando registro');
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: `Processado com sucesso para ${telefone}`,
      ganhos: { 
        pontos: pontosGanhos, 
        cashback: cashbackGanho.toFixed(2), 
        tickets: ticketsGanhos, 
        novo_gasto_total: novoGasto,
        novo_nivel: nivelInfo.nivel
      }
    });

  } catch (error: any) {
    console.error('Erro Webhook Saipos:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
     