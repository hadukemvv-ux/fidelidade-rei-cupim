import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getNivelPorGasto, calcularPontosEarned, calcularTicketsEarned, calcularCashbackValue, type NivelFidelidade } from "@/lib/fidelidade-rules";

async function registrarLog(
  tipo: string,
  mensagem: string,
  id_cliente?: number,
  id_sale?: number,
  valor?: number
) {
  await supabaseAdmin.from("saipos_cron_logs").insert({
    tipo,
    mensagem,
    id_cliente,
    id_sale,
    valor,
  });
}

export async function processarVenda(venda: any) {
  const idSale = venda.id_sale;

  // 0) Evitar duplicação
  const jaProcessado = await supabaseAdmin
    .from("saipos_pedidos_processados")
    .select("id_sale")
    .eq("id_sale", idSale)
    .maybeSingle();

  if (jaProcessado.data) {
    await registrarLog(
      "pedido_duplicado",
      "Pedido ignorado — já processado anteriormente",
      undefined,
      idSale
    );
    return;
  }

  // Ignorar canceladas
  if (venda.canceled === "Y") {
    await registrarLog(
      "pedido_cancelado",
      "Pedido ignorado — cancelado",
      undefined,
      idSale
    );
    return;
  }

  const valor = Number(venda.total_amount || 0);
  if (valor <= 0) {
    await registrarLog(
      "pedido_invalido",
      "Pedido ignorado — valor zero",
      undefined,
      idSale
    );
    return;
  }

  const cpf = venda.customer?.cpf_cnpj || null;
  const telefone = venda.customer?.phone?.[0] || null;
  const nome = venda.customer?.name || "Cliente";

  // 1) Buscar cliente
  let cliente = null;

  const busca = await supabaseAdmin
    .from("base_clientes_saipos")
    .select("*")
    .or(`cpf.eq.${cpf},telefone.eq.${telefone}`)
    .maybeSingle();

  if (busca.data) cliente = busca.data;

  // 2) Criar cliente se não existe
  if (!cliente) {
    const insert = await supabaseAdmin
      .from("base_clientes_saipos")
      .insert({
        nome,
        telefone,
        cpf,
        nivel: "bronze",
        pontos: 0,
        cashback: 0,
        tickets: 0,
        total_gasto: 0,
        qtd_pedidos: 0,
        primeira_compra: new Date().toISOString(),
        ultima_compra: new Date().toISOString(),
      })
      .select()
      .single();

    cliente = insert.data;

    await registrarLog(
      "cliente_criado",
      `Cliente criado automaticamente: ${nome}`,
      cliente.id,
      idSale
    );
  }

  // 3) Calcular inatividade
  const hoje = new Date();
  const ultima = new Date(cliente.ultima_compra);
  const diasSemComprar = Math.floor(
    (hoje.getTime() - ultima.getTime()) / 86400000
  );

  // 4) Calculate new total spent and get level
  const novoTotal = Number(cliente.total_gasto) + valor;
  const nivelInfo = getNivelPorGasto(novoTotal);
  const pontosGanhos = calcularPontosEarned(valor, novoTotal);
  const cashbackGanhos = calcularCashbackValue(valor, novoTotal);
  const ticketsGanhos = calcularTicketsEarned(valor, novoTotal);

  // 5) Atualizar cliente with new level and benefits
  await supabaseAdmin
    .from("base_clientes_saipos")
    .update({
      nome,
      telefone,
      cpf,
      nivel: nivelInfo.nivel.toLowerCase(),
      pontos: Number(cliente.pontos) + pontosGanhos,
      cashback: Number(cliente.cashback) + cashbackGanhos,
      tickets: Number(cliente.tickets) + ticketsGanhos,
      total_gasto: novoTotal,
      qtd_pedidos: Number(cliente.qtd_pedidos) + 1,
      ultima_compra: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", cliente.id);

  // Log principal
  await registrarLog(
    "pedido_processado",
    `Pedido processado — R$ ${valor.toFixed(2)}`,
    cliente.id,
    idSale,
    valor
  );

  // 6) Marcar como processado
  await supabaseAdmin
    .from("saipos_pedidos_processados")
    .insert({ id_sale: idSale });
}