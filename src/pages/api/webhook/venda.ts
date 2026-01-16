import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// ==============================================
// CONFIGURAÇÕES DO PROGRAMA DE FIDELIDADE
// ==============================================

// Base (Bronze) - por R$ 1 gasto
const BASE_PONTOS_POR_REAL = 10;
const BASE_TICKETS_POR_REAL = 1;
const BASE_CASHBACK_PERCENTUAL = 0.005; // 0,5%

// Multiplicadores por nível
const MULTIPLICADOR_POR_NIVEL: Record<string, number> = {
  Bronze: 1.0,   // 100% do base
  Prata: 1.5,    // 150% do base (+50%)
  Ouro: 2.5,     // 250% do base (+150%)
};

// Faixas de pontos para cada nível
function calcularNivel(totalPontos: number): string {
  if (totalPontos >= 5001) return 'Ouro';
  if (totalPontos >= 2001) return 'Prata';
  return 'Bronze';
}

// Token de segurança
const SAIPOS_SECRET = process.env.SAIPOS_SECRET || null;

// ==============================================
// HANDLER DO WEBHOOK
// ==============================================
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1️⃣ Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // 2️⃣ Verifica token (se configurado)
  if (SAIPOS_SECRET) {
    const token = req.headers['x-api-key'];
    if (token !== SAIPOS_SECRET) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // 3️⃣ Validação dos campos recebidos
  const { id_externo, telefone, valor, data_venda } = req.body as {
    id_externo: string;
    telefone: string;
    valor: number;
    data_venda: string;
  };

  if (!id_externo || !telefone || !valor || !data_venda) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  // -------------------------------------------------
  // 4️⃣ Garantir que o cliente exista (upsert)
  // -------------------------------------------------
  const { error: errCliente } = await supabaseAdmin
    .from('clientes')
    .upsert({ telefone })
    .select()
    .single();

  if (errCliente) {
    return res.status(500).json({ error: errCliente.message });
  }

  // -------------------------------------------------
  // 5️⃣ Inserir a venda (ignora duplicatas)
  // -------------------------------------------------
  const { error: errVenda } = await supabaseAdmin
    .from('vendas')
    .insert({
      id_externo,
      telefone,
      valor,
      data_venda: new Date(data_venda),
      processada: false,
    });

  if (errVenda && errVenda.code !== '23505') {
    return res.status(500).json({ error: errVenda.message });
  }

  // -------------------------------------------------
  // 6️⃣ Buscar dados atuais do cliente
  // -------------------------------------------------
  const { data: pontosRow } = await supabaseAdmin
    .from('pontos')
    .select('nivel,total')
    .eq('telefone', telefone)
    .single();

  const { data: cbRow } = await supabaseAdmin
    .from('cashback')
    .select('saldo')
    .eq('telefone', telefone)
    .single();

  const { data: tkRow } = await supabaseAdmin
    .from('tickets')
    .select('quantidade')
    .eq('telefone', telefone)
    .single();

  // -------------------------------------------------
  // 7️⃣ Calcular benefícios com base no nível ATUAL
  // -------------------------------------------------
  const nivelAtual = pontosRow?.nivel ?? 'Bronze';
  const multiplicador = MULTIPLICADOR_POR_NIVEL[nivelAtual] ?? 1.0;

  // Pontos: 10 por R$1 × multiplicador
  const pontosGanhos = Math.floor(valor * BASE_PONTOS_POR_REAL * multiplicador);

  // Tickets: 1 por R$1 × multiplicador (arredonda para baixo)
  const ticketsGanhos = Math.floor(valor * BASE_TICKETS_POR_REAL * multiplicador);

  // Cashback: 0,5% × multiplicador
  const cashbackGanhos = parseFloat((valor * BASE_CASHBACK_PERCENTUAL * multiplicador).toFixed(2));

  // -------------------------------------------------
  // 8️⃣ Atualizar PONTOS e recalcular NÍVEL
  // -------------------------------------------------
  const totalPontosNovo = (pontosRow?.total ?? 0) + pontosGanhos;
  const novoNivel = calcularNivel(totalPontosNovo);

  await supabaseAdmin
    .from('pontos')
    .upsert({
      telefone,
      total: totalPontosNovo,
      nivel: novoNivel,
      atualizado_em: new Date().toISOString(),
    });

  // -------------------------------------------------
  // 9️⃣ Atualizar CASHBACK
  // -------------------------------------------------
  const totalCashbackNovo = parseFloat(((cbRow?.saldo ?? 0) + cashbackGanhos).toFixed(2));

  await supabaseAdmin
    .from('cashback')
    .upsert({
      telefone,
      saldo: totalCashbackNovo,
      atualizado_em: new Date().toISOString(),
    });

  // -------------------------------------------------
  // 🔟 Atualizar TICKETS
  // -------------------------------------------------
  const totalTicketsNovo = (tkRow?.quantidade ?? 0) + ticketsGanhos;

  await supabaseAdmin
    .from('tickets')
    .upsert({
      telefone,
      quantidade: totalTicketsNovo,
      atualizado_em: new Date().toISOString(),
    });

  // -------------------------------------------------
  // 1️⃣1️⃣ Atualizar última compra do cliente
  // -------------------------------------------------
  await supabaseAdmin
    .from('clientes')
    .update({ ultima_compra: new Date().toISOString() })
    .eq('telefone', telefone);

  // -------------------------------------------------
  // 1️⃣2️⃣ Marcar a venda como processada
  // -------------------------------------------------
  await supabaseAdmin
    .from('vendas')
    .update({ processada: true })
    .eq('id_externo', id_externo);

  // -------------------------------------------------
  // 1️⃣3️⃣ Resposta final
  // -------------------------------------------------
  return res.status(200).json({
    message: 'Venda processada',
    telefone,
    valorCompra: valor,
    nivelAnterior: nivelAtual,
    nivelNovo: novoNivel,
    subiuDeNivel: novoNivel !== nivelAtual,
    multiplicadorAplicado: multiplicador,
    beneficiosGanhos: {
      pontos: pontosGanhos,
      cashback: cashbackGanhos,
      tickets: ticketsGanhos,
    },
    totaisAtualizados: {
      pontos: totalPontosNovo,
      cashback: totalCashbackNovo,
      tickets: totalTicketsNovo,
    },
  });
}
