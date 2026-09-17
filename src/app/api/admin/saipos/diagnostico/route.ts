import { NextRequest, NextResponse } from "next/server";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { buscarVendasSaipos, periodoDiaSaoPaulo, SaiposApiError, type VendaSaipos } from "@/lib/saipos";

export const dynamic = "force-dynamic";

type ObjetoSaipos = Record<string, unknown>;

function asObject(value: unknown): ObjetoSaipos | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ObjetoSaipos
    : null;
}

function textoSeguro(value: unknown) {
  if (typeof value === "string" && value.length <= 80) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Resume uma venda sem retornar nome, telefone, CPF ou payload bruto. */
function resumirVenda(venda: VendaSaipos) {
  const raw = venda as ObjetoSaipos;
  const tableOrder = asObject(raw.table_order);
  const payments = Array.isArray(raw.payments) ? raw.payments : [];

  return {
    id_sale: Number.isSafeInteger(Number(venda.id_sale)) ? Number(venda.id_sale) : null,
    total_amount: Number.isFinite(Number(venda.total_amount)) ? Number(venda.total_amount) : null,
    canceled: textoSeguro(venda.canceled),
    created_at: textoSeguro(venda.created_at),
    updated_at: textoSeguro(raw.updated_at),
    sale_type: textoSeguro(raw.id_sale_type),
    table_order: tableOrder ? {
      id_store_table: textoSeguro(tableOrder.id_store_table),
      id_store_order_card: textoSeguro(tableOrder.id_store_order_card),
      status: textoSeguro(tableOrder.status),
      available_fields: Object.keys(tableOrder).sort(),
    } : null,
    payments: payments.slice(0, 5).map((payment) => {
      const item = asObject(payment);
      return item ? { available_fields: Object.keys(item).sort() } : { available_fields: [] };
    }),
    available_fields: Object.keys(raw)
      .filter((field) => !["customer", "customer_phone", "customer_cpf", "telefone"].includes(field))
      .sort(),
  };
}

export async function GET(request: NextRequest) {
  const actor = await requireOperationalActor(request, "superadmin");
  if (actor instanceof NextResponse) return actor;

  const requestedDay = new URL(request.url).searchParams.get("dia");
  const dia = requestedDay || new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  try {
    const { inicio, fim } = periodoDiaSaoPaulo(dia);
    const vendas = await buscarVendasSaipos({ inicio, fim, limit: 50 });

    return NextResponse.json({
      ok: true,
      modo: "somente_leitura",
      dia,
      periodo: { inicio, fim },
      vendas_encontradas: vendas.length,
      amostras: vendas.slice(0, 10).map(resumirVenda),
      observacao: "Nenhum cliente, ponto, QR, cupom ou registro de venda foi criado ou alterado por esta consulta.",
    });
  } catch (error) {
    if (error instanceof SaiposApiError) {
      return NextResponse.json({
        error: "A Saipos recusou ou não concluiu a consulta.",
        status_fornecedor: error.status,
        tentativas: error.tentativas,
      }, { status: 502 });
    }

    if (error instanceof Error && error.message === "Token Saipos não configurado.") {
      return NextResponse.json({ error: "SAIPOS_TOKEN não está configurado como segredo no servidor." }, { status: 503 });
    }
    return NextResponse.json({ error: "Não foi possível executar o diagnóstico Saipos." }, { status: 500 });
  }
}
