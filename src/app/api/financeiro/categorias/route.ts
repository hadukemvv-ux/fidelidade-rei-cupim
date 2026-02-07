import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// =========================================================
// FINANCEIRO — CATEGORIAS (ALPHA)
//
// Como ainda não temos vendas_processadas automáticas,
// usamos os resgates como PROXY de consumo real.
//
// - Categorias mais utilizadas
// - Produtos mais resgatados
// - Popularidade do cardápio
//
// No Beta:
// substituímos por itens reais da Saipos.
//
// =========================================================

export async function GET() {
  try {
    // Carrega os produtos cadastrados no cardápio
    const { data: produtos } = await supabaseAdmin
      .from("produtos_loja")
      .select("id, nome, categoria, custo_em_pontos, destaque, ativo");

    // Carrega os resgates feitos pelos clientes (proxy de demanda)
    const { data: resgates } = await supabaseAdmin
      .from("resgates")
      .select("produto_id, cliente_id, criado_em");

    // Caso ainda não existam dados suficientes
    if (!produtos || produtos.length === 0) {
      return NextResponse.json({
        categorias: {},
        top_produtos: [],
        total_resgates: 0,
      });
    }

    // Inicializa categorias
    const categoriasContagem: Record<string, number> = {};
    const produtosContagem: Record<number, number> = {};

    // Marca categorias existentes mesmo sem resgates
    produtos.forEach((p) => {
      if (!categoriasContagem[p.categoria]) {
        categoriasContagem[p.categoria] = 0;
      }
    });

    // Caso não haja resgates ainda
    if (!resgates || resgates.length === 0) {
      return NextResponse.json({
        categorias: categoriasContagem,
        top_produtos: [],
        total_resgates: 0,
      });
    }

    // Contabiliza resgates por produto e categoria
    resgates.forEach((r) => {
      const produto = produtos.find((p) => p.id === r.produto_id);
      if (!produto) return;

      // Contagem por produto
      produtosContagem[produto.id] =
        (produtosContagem[produto.id] || 0) + 1;

      // Contagem por categoria
      categoriasContagem[produto.categoria] =
        (categoriasContagem[produto.categoria] || 0) + 1;
    });

    // Monta ranking de produtos
    const top_produtos = Object.entries(produtosContagem)
      .map(([id, qtd]) => {
        const prod = produtos.find((p) => p.id == Number(id));
        return {
          id: Number(id),
          nome: prod?.nome || "Desconhecido",
          categoria: prod?.categoria || "Indefinida",
          resgates: qtd,
        };
      })
      .sort((a, b) => b.resgates - a.resgates)
      .slice(0, 10);

    return NextResponse.json({
      categorias: categoriasContagem,
      top_produtos,
      total_resgates: resgates.length,
    });
  } catch (err: any) {
    console.error("ERRO /financeiro/categorias:", err);
    return NextResponse.json(
      { erro: err.message || "Erro interno." },
      { status: 500 }
    );
  }
}