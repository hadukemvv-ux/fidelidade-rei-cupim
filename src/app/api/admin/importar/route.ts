import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Remove acentos
function normalizarTexto(s: string) {
  return s
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Similaridade leve (retorna true se nome for compatível)
function nomesParecidos(a: string, b: string) {
  if (!a || !b) return false;
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);

  // Match exato após normalização
  if (na === nb) return true;

  // Se contém parte relevante do nome → ok
  return na.includes(nb) || nb.includes(na);
}

// Converte moeda brasileira em número
function parseValor(v: any) {
  if (!v) return 0;
  let s = v.toString().trim();
  s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Regras de nível
function nivelPorGasto(total: number) {
  if (total >= 600) return "REI_DO_CUPIM";
  if (total >= 300) return "OURO";
  if (total >= 100) return "PRATA";
  return "BRONZE";
}

function regrasNivel(nivel: string) {
  switch (nivel) {
    case "PRATA":
      return { multPontos: 7, percCash: 0.01, tickets: 2 };
    case "OURO":
      return { multPontos: 10, percCash: 0.02, tickets: 3 };
    case "REI_DO_CUPIM":
      return { multPontos: 14, percCash: 0.03, tickets: 4 };
    default:
      return { multPontos: 4, percCash: 0.0025, tickets: 1 };
  }
}

// Registrar extrato
async function registrarExtrato(cliente_id: number, pontos: number, descricao: string) {
  try {
    await supabaseAdmin.from("extrato_pontos").insert({
      cliente_id,
      tipo: "entrada",
      valor: pontos,
      origem: "IMPORTACAO_VENDAS",
      descricao,
      criado_em: new Date().toISOString(),
      metodo: "importacao"
    });
  } catch (e) {
    console.log("ERRO EXTRATO:", e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { erro: "Formato inválido. Envie { rows: [...] }" },
        { status: 400 }
      );
    }

    const rows = body.rows;

    let processados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let naoEncontrados = 0;

    // Buscar TODOS clientes da base (5k)
    const { data: baseClientes } = await supabaseAdmin
      .from("base_clientes_saipos")
      .select("*");

    if (!baseClientes) {
      return NextResponse.json(
        { erro: "Não foi possível carregar a base de clientes." },
        { status: 500 }
      );
    }

    for (const row of rows) {
      try {
        const consumidor = row["Consumidor"] || row["CONSUMIDOR"] || null;
        if (!consumidor) {
          ignorados++;
          continue;
        }

        const valor = 
          parseValor(row["Valor"]) ||
          parseValor(row["Itens"]) ||
          parseValor(row["Total"]) ||
          0;

        if (valor <= 0) {
          ignorados++;
          continue;
        }

        // --- BUSCAR CLIENTE POR NOME (SIMILARIDADE LEVE) ---
        const clienteEncontrado = baseClientes.find((c: any) =>
          nomesParecidos(c.nome, consumidor)
        );

        if (!clienteEncontrado) {
          naoEncontrados++;
          continue;
        }

        const cliente = clienteEncontrado;

        // ------- ATUALIZAR FIDELIDADE -------
        const totalNovo = (cliente.total_gasto || 0) + valor;
        const nivelNovo = nivelPorGasto(totalNovo);
        const regras = regrasNivel(nivelNovo);

        const pontosGanhos = Math.floor(valor * regras.multPontos);
        const cashbackGanhos = Number((valor * regras.percCash).toFixed(2));
        const ticketsGanhos = Math.floor(valor / 50) * regras.tickets;

        await supabaseAdmin
          .from("base_clientes_saipos")
          .update({
            total_gasto: totalNovo,
            qtd_pedidos: (cliente.qtd_pedidos || 0) + 1,
            ultima_compra: new Date().toISOString(),

            nivel: nivelNovo,
            pontos: (cliente.pontos || 0) + pontosGanhos,
            cashback: Number(((cliente.cashback || 0) + cashbackGanhos).toFixed(2)),
            tickets: (cliente.tickets || 0) + ticketsGanhos,

            atualizado_em: new Date().toISOString()
          })
          .eq("id", cliente.id);

        await registrarExtrato(
          cliente.id,
          pontosGanhos,
          `Compra importada: R$ ${valor.toFixed(2)}`
        );

        atualizados++;
        processados++;

      } catch (e) {
        console.log("Erro ao processar venda:", e);
      }
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Importação de vendas concluída.",
      processados,
      atualizados,
      ignorados,
      naoEncontrados
    });

  } catch (err: any) {
    console.error("ERRO IMPORTAÇÃO VENDAS:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno ao importar vendas." },
      { status: 500 }
    );
  }
}