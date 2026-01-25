import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Token de segurança para garantir que só a Saipos chame essa rota
// Você deve definir isso no seu .env como SAIPOS_TOKEN=seu_token_secreto
const SECRET_TOKEN = process.env.SAIPOS_TOKEN || 'cupim123'; 

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

// Reutilizando a lógica de cálculo de nível para saber o multiplicador
function getMultiplicadorNivel(gastoTotal: number) {
  if (gastoTotal >= 700) return 14; // Rei
  if (gastoTotal >= 400) return 8;  // Ouro
  if (gastoTotal >= 200) return 4;  // Prata
  return 2;                         // Bronze
}

function getCashbackPercent(gastoTotal: number) {
  if (gastoTotal >= 700) return 0.03; // 3%
  if (gastoTotal >= 400) return 0.02; // 2%
  if (gastoTotal >= 200) return 0.01; // 1%
  return 0.005;                       // 0.5%
}

export async function POST(req: Request) {
  try {
    // 1. Verificação de Segurança (Header)
    const authHeader = req.headers.get('x-auth-token');
    if (authHeader !== SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // 2. Extração de Dados
    // A Saipos pode mandar campos diferentes, ajuste conforme a documentação deles
    const telefoneBruto = body.customer_phone || body.telefone || '';
    const valorPedido = Number(body.order_total || body.valor_total || 0);
    const orderId = String(body.order_id || body.id_pedido || '');
    const origem = String(body.source || body.origem || 'SAIPOS').toUpperCase();

    // Se não tem valor, ignora
    if (valorPedido <= 0) {
      return NextResponse.json({ ok: false, message: 'Valor zerado, ignorado.' });
    }

    // 3. Tratamento do Telefone (O "Problema iFood")
    const telefone = onlyDigits(telefoneBruto);

    // Se não tiver telefone válido (ex: iFood mascarado ou sem telefone)
    if (!telefone || telefone.length < 10) {
      // AQUI entra a lógica futura do QR Code na nota.
      // Por enquanto, salvamos em uma tabela de 'pedidos_sem_cliente' para resgate posterior?
      // Ou apenas retornamos OK para não travar a Saipos.
      return NextResponse.json({ ok: true, message: 'Pedido sem telefone válido. Aguardando resgate manual (QR Code).' });
    }

    // 4. Buscar ou Criar Cliente
    let { data: cliente } = await supabaseAdmin.from('clientes').select('*').eq('telefone', telefone).maybeSingle();

    if (!cliente) {
      // Cliente novo vindo da Saipos! Criamos cadastro básico.
      const { data: novoCliente, error: errCreate } = await supabaseAdmin.from('clientes').insert({
        telefone,
        nome: body.customer_name || 'Cliente Saipos',
        origem_cadastro: 'SAIPOS_AUTO',
        criado_em: nowIso(),
        ultima_compra: nowIso() // Já marca a compra
      }).select().single();

      if (errCreate) throw errCreate;
      cliente = novoCliente;
    } else {
      // Atualiza última compra
      await supabaseAdmin.from('clientes').update({ ultima_compra: nowIso() }).eq('telefone', telefone);
    }

    // 5. Garantir Tabelas de Saldos
    const { data: pts } = await supabaseAdmin.from('pontos').select('*').eq('telefone', telefone).maybeSingle();
    if (!pts) await supabaseAdmin.from('pontos').insert({ telefone, total: 0, nivel: 'BRONZE', gasto_mensal_atual: 0 }); // gasto_mensal_atual = Gasto Vitalício

    // 6. Calcular Pontos e Cashback
    // Lemos o gasto ATUAL (Vitalício) para definir o multiplicador DESTA compra
    // OBS: O cliente ganha pontos desta compra com base no nível que ele TINHA antes dela. (Padrão de mercado)
    const gastoVitalicioAntigo = Number(pts?.gasto_mensal_atual || 0);
    
    const multiplicador = getMultiplicadorNivel(gastoVitalicioAntigo);
    const pontosGanhos = Math.floor(valorPedido * multiplicador);
    
    const percentCashback = getCashbackPercent(gastoVitalicioAntigo);
    const cashbackGanho = valorPedido * percentCashback;

    // Tickets: 1 a cada R$ 50 (exemplo base, ajustável por nível se quiser)
    // Regra da sua tabela: Bronze=1/50, Prata=2/50, etc.
    let ticketsPor50 = 1;
    if (gastoVitalicioAntigo >= 700) ticketsPor50 = 4;
    else if (gastoVitalicioAntigo >= 400) ticketsPor50 = 3;
    else if (gastoVitalicioAntigo >= 200) ticketsPor50 = 2;
    
    const ticketsGanhos = Math.floor(valorPedido / 50) * ticketsPor50;

    // 7. Atualizar Saldos e Nível (Gasto Vitalício)
    const novoGastoVitalicio = gastoVitalicioAntigo + valorPedido;
    
    // Atualiza Pontos e XP
    await supabaseAdmin.from('pontos').update({
      total: (pts?.total || 0) + pontosGanhos,
      gasto_mensal_atual: novoGastoVitalicio, // Acumula XP
      atualizado_em: nowIso()
    }).eq('telefone', telefone);

    // Atualiza Cashback
    const { data: cb } = await supabaseAdmin.from('cashback').select('saldo').eq('telefone', telefone).maybeSingle();
    const saldoCbAntigo = Number(cb?.saldo || 0);
    if (cb) {
      await supabaseAdmin.from('cashback').update({ saldo: saldoCbAntigo + cashbackGanho }).eq('telefone', telefone);
    } else {
      await supabaseAdmin.from('cashback').insert({ telefone, saldo: cashbackGanho });
    }

    // Atualiza Tickets
    if (ticketsGanhos > 0) {
      const { data: tk } = await supabaseAdmin.from('tickets').select('quantidade').eq('telefone', telefone).maybeSingle();
      const saldoTkAntigo = Number(tk?.quantidade || 0);
      if (tk) {
        await supabaseAdmin.from('tickets').update({ quantidade: saldoTkAntigo + ticketsGanhos }).eq('telefone', telefone);
      } else {
        await supabaseAdmin.from('tickets').insert({ telefone, quantidade: ticketsGanhos });
      }
    }

    // 8. Registrar Histórico (Opcional mas recomendado)
    // Se tiver tabela de 'extrato' ou 'historico_pontos', insira aqui.
    
    return NextResponse.json({ 
      ok: true, 
      message: `Processado com sucesso para ${telefone}`,
      ganhos: { pontos: pontosGanhos, cashback: cashbackGanho, tickets: ticketsGanhos, novo_xp: novoGastoVitalicio }
    });

  } catch (error: any) {
    console.error('Erro Webhook Saipos:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}