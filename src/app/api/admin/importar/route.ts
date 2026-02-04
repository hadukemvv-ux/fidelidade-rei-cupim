import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// --- UTILITÁRIOS ---
function limparTel(v: string) {
  return v ? v.replace(/\D/g, "") : "";
}

function parseValorItens(v: any) {
  if (v === null || v === undefined) return 0;
  let s = v.toString().trim();
  s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// --- REGRAS DE NÍVEL ---
function nivelPorGasto(total: number) {
  if (total >= 600) return "REI_DO_CUPIM";
  if (total >= 300) return "OURO";
  if (total >= 100) return "PRATA";
  return "BRONZE";
}

// --- MULTIPLICADORES POR NÍVEL ---
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

// --- REGISTRA EXTRATO ---
async function registrarExtrato(cliente_id: number, pontos: number, descricao: string) {
  try {
    await supabaseAdmin.from("extrato_pontos").insert({
      cliente_id,
      tipo: "entrada",
      valor: pontos,
      origem: "IMPORTACAO_XLS",
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
    let novos = 0;
    let atualizados = 0;

    // Vamos gerar logs de debug (opcional)
    console.log("IMPORTAÇÃO XLS — total de linhas:", rows.length);

    // LOOP PRINCIPAL DE CADA LINHA DA PLANILHA
    for (const row of rows) {
      try {
        // --- CAMPOS POSSÍVEIS DE TELEFONE ---
        const telRaw =
          row["Telefone"] ||
          row["Celular"] ||
          row["Whatsapp"] ||
          row["Contato"] ||
          "";

        const telefone = limparTel(String(telRaw));
        if (!telefone || telefone.length < 8) continue;

        // --- NOME ---
        const nome = row["Nome"] || row["Cliente"] || row["Consumidor"] || "Cliente";

        // --- VALOR DOS ITENS ---
        const valorItens =
          parseValorItens(row["Itens"]) ||
          parseValorItens(row["Valor Líquido"]) ||
          parseValorItens(row["Valor"]) ||
          0;

        if (valorItens <= 0) continue;

        // --- DESCOBRIR CLIENTE EXISTENTE ---
        const { data: existente } = await supabaseAdmin
          .from("base_clientes_saipos")
          .select("*")
          .eq("telefone", telefone)
          .maybeSingle();

        // Vamos preparar dados "antes" e "depois"
        let cliente = existente || null;
                // ====================================================================
        // === SE O CLIENTE NÃO EXISTE, VAMOS CRIAR UM NOVO ===================
        // ====================================================================
        if (!cliente) {
          const nivelInicial = "BRONZE";
          const regras = regrasNivel(nivelInicial);

          const pontosGanhos = Math.floor(valorItens * regras.multPontos);
          const cashbackGanhos = Number((valorItens * regras.percCash).toFixed(2));
          const ticketsGanhos = Math.floor(valorItens / 50) * regras.tickets;

          const insert = await supabaseAdmin
            .from("base_clientes_saipos")
            .insert({
              telefone,
              nome,
              nivel: nivelInicial,
              pontos: pontosGanhos,
              cashback: cashbackGanhos,
              tickets: ticketsGanhos,
              total_gasto: valorItens,
              qtd_pedidos: 1,
              primeira_compra: new Date().toISOString(),
              ultima_compra: new Date().toISOString(),
              atualizado_em: new Date().toISOString()
            })
            .select("*")
            .single();

          cliente = insert.data;
          novos++;

          await registrarExtrato(
            cliente.id,
            pontosGanhos,
            `Compra importada (novo cliente): R$ ${valorItens.toFixed(2)}`
          );

          processados++;
          continue;
        }

        // ====================================================================
        // === CLIENTE EXISTE — ATUALIZAR DADOS (SEM MEXER NO NOME / NASCIMENTO)
        // ====================================================================

        const totalDepois = (cliente.total_gasto || 0) + valorItens;
        const novoNivel = nivelPorGasto(totalDepois);

        const regras = regrasNivel(novoNivel);

        const pontosGanhos = Math.floor(valorItens * regras.multPontos);
        const cashbackGanhos = Number((valorItens * regras.percCash).toFixed(2));
        const ticketsGanhos = Math.floor(valorItens / 50) * regras.tickets;

        await supabaseAdmin
          .from("base_clientes_saipos")
          .update({
            // nome: cliente.nome (não altera)
            total_gasto: totalDepois,
            ultima_compra: new Date().toISOString(),
            nivel: novoNivel,
            pontos: (cliente.pontos || 0) + pontosGanhos,
            cashback: Number(((cliente.cashback || 0) + cashbackGanhos).toFixed(2)),
            tickets: (cliente.tickets || 0) + ticketsGanhos,
            qtd_pedidos: (cliente.qtd_pedidos || 0) + 1,
            atualizado_em: new Date().toISOString()
          })
          .eq("id", cliente.id);

        atualizados++;

        await registrarExtrato(
          cliente.id,
          pontosGanhos,
          `Compra importada: R$ ${valorItens.toFixed(2)}`
        );

        processados++;

      } catch (erroLinha: any) {
        console.log("Erro ao processar linha:", erroLinha);
      }
    } // fim do for
        // ==========================================================
    // === RESPOSTA FINAL DA IMPORTAÇÃO =========================
    // ==========================================================
    return NextResponse.json({
      sucesso: true,
      mensagem: "Importação concluída com sucesso!",
      processados,
      novos,
      atualizados
    });

  } catch (err: any) {
    console.error("ERRO IMPORTAÇÃO XLS:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno ao importar planilha." },
      { status: 500 }
    );
  }
}