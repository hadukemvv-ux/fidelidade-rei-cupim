import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Remove tudo que não for dígito
function limparTel(v: string) {
  return v ? v.replace(/\D/g, "") : "";
}

// Converte número brasileiro (1.234,56 → 1234.56)
function parseMoeda(v: any) {
  if (!v) return 0;
  let s = v.toString().trim();
  s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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
    let ignorados = 0;

    console.log("IMPORTACAO CLIENTES — total linhas:", rows.length);

    for (const row of rows) {
      try {
        // CAMPOS DA PLANILHA DE CLIENTES SAIPOS
        const nome = row["Nome"] || row["Cliente"] || row["Consumidor"] || null;
        const telefone = limparTel(
          row["Telefone"] || row["Celular"] || row["WhatsApp"] || row["Contato"] || ""
        );
        const email = row["Email"] || null;
        const cpf = row["CPF/CNPJ"] || row["CPF"] || null;
        const data_nasc = row["Data Aniversário"] || null;

        const qtdPedidos = parseInt(row["Qtd. Pedidos"] || "0", 10);
        const totalGasto = parseMoeda(row["Valor Total"] || 0);
        const ultimaCompra = row["Última Compra"] || null;

        // Regras de importação:
        // 1. Nome precisa existir
        if (!nome) {
          ignorados++;
          continue;
        }

        // 2. Telefone precisa ser válido (alpha depende do telefone)
        if (!telefone || telefone.length < 9) {
          ignorados++;
          continue;
        }

        // 3. Buscar cliente existente pelo telefone
        const { data: existente } = await supabaseAdmin
          .from("base_clientes_saipos")
          .select("*")
          .eq("telefone", telefone)
          .maybeSingle();

        // ============================================================
        // === 1) CLIENTE NÃO EXISTE → CRIAR NOVO ====================
        // ============================================================
        if (!existente) {
          const { data: criado, error: erroInsert } = await supabaseAdmin
            .from("base_clientes_saipos")
            .insert({
              nome,
              telefone,
              email,
              cpf,
              data_nascimento: data_nasc || null,

              // Dados estruturais vindos da Saipos
              total_gasto: totalGasto,
              qtd_pedidos: qtdPedidos,
              primeira_compra: ultimaCompra ? new Date(ultimaCompra).toISOString() : null,
              ultima_compra: ultimaCompra ? new Date(ultimaCompra).toISOString() : null,

              // Dados internos do Alpha
              nivel: "BRONZE",
              pontos: 0,
              cashback: 0,
              tickets: 0,

              atualizado_em: new Date().toISOString()
            })
            .select()
            .single();

          if (erroInsert) {
            console.error("Erro ao criar cliente:", erroInsert);
            ignorados++;
            continue;
          }

          novos++;
          processados++;
          continue;
        }

        // ============================================================
        // === 2) CLIENTE EXISTE → ATUALIZAR CAMPOS ==================
        // ============================================================
        const atualiza = {
          nome: existente.nome || nome, // Nome só substitui se antes estiver vazio
          email: email || existente.email,
          cpf: cpf || existente.cpf,
          data_nascimento: data_nasc || existente.data_nascimento,

          // Dados estruturais (SOMENTE do relatório de clientes)
          total_gasto: totalGasto || existente.total_gasto,
          qtd_pedidos: qtdPedidos || existente.qtd_pedidos,
          ultima_compra: ultimaCompra
            ? new Date(ultimaCompra).toISOString()
            : existente.ultima_compra,

          // NÃO ALTERAMOS:
          // pontos, cashback, tickets, nivel

          atualizado_em: new Date().toISOString()
        };

        await supabaseAdmin
          .from("base_clientes_saipos")
          .update(atualiza)
          .eq("id", existente.id);

        atualizados++;
        processados++;
      } catch (erroLinha) {
        console.error("Erro ao processar linha:", erroLinha);
      }
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Importação de clientes concluída.",
      processados,
      novos,
      atualizados,
      ignorados
    });
  } catch (err: any) {
    console.error("ERRO IMPORTACAO CLIENTES:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno ao importar clientes." },
      { status: 500 }
    );
  }
}