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

  if (!idSale) {
    await registrarLog(
      "pedido_invalido",
      "Pedido ignorado — id_sale ausente"
    );
    return;
  }

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

  const cpf = venda.customer?.cpf_cnpj || venda.customer_cpf || null;
  const telefoneRaw = venda.customer?.phone;
  const telefone = Array.isArray(telefoneRaw)
    ? telefoneRaw[0] || null
    : typeof telefoneRaw === "string"
      ? telefoneRaw
      : venda.customer_phone || venda.telefone || null;
  const nome = venda.customer?.name || "Cliente";

  if (!cpf && !telefone) {
    await registrarLog(
      "pedido_sem_identificacao",
      "Pedido ignorado — cliente sem CPF e telefone",
      undefined,
      idSale,
      valor
    );
    return;
  }

  // 1) Buscar cliente
  let cliente = null;

  const filtros: string[] = [];
  if (cpf) filtros.push(`cpf.eq.${cpf}`);
  if (telefone) filtros.push(`telefone.eq.${telefone}`);

  const busca = await supabaseAdmin
    .from("base_clientes_saipos")
    .select("*")
    .or(filtros.join(","))
    .maybeSingle();

  if (busca.error) {
    throw new Error(`Falha ao buscar cliente da venda ${idSale}: ${busca.error.message}`);
  }

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

    if (insert.error || !insert.data) {
      throw new Error(
        `Falha ao criar cliente da venda ${idSale}: ${insert.error?.message || "sem retorno do Supabase"}`
      );
    }

    cliente = insert.data;

    await registrarLog(
      "cliente_criado",
      `Cliente criado automaticamente: ${nome}`,
      cliente.id,
      idSale
    );
  }

  // 3) Calculate new total spent and get level
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