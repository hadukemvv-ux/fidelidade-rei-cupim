import { NextRequest, NextResponse } from "next/server";
import { requireOperationalActor } from "@/lib/operationalAuth";
import { buscarTodasVendasSaipos, buscarVendasSaipos, periodoDiaSaoPaulo, SaiposApiError, type ColunaDataSaipos, type VendaSaipos } from "@/lib/saipos";

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

function normalizarReferencia(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().toLowerCase()
    : "";
}

function valorSeguro(value: unknown) {
  const valor = Number(value);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/** Procura apenas identificadores operacionais de mesa/comanda, não cliente. */
function correspondeReferencia(venda: VendaSaipos, referencia: string) {
  const raw = venda as ObjetoSaipos;
  const tableOrder = asObject(raw.table_order);
  if (!tableOrder) return false;

  return [
    tableOrder.id_store_table,
    tableOrder.id_store_order_card,
    tableOrder.table_number,
    tableOrder.order_card_number,
  ].some((candidate) => normalizarReferencia(candidate) === referencia);
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
      return item ? {
        payment_amount: valorSeguro(item.payment_amount),
        desc_store_payment_type: textoSeguro(item.desc_store_payment_type),
        created_at: textoSeguro(item.created_at),
        available_fields: Object.keys(item).sort(),
      } : { payment_amount: null, desc_store_payment_type: null, created_at: null, available_fields: [] };
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
  const referenceParam = new URL(request.url).searchParams.get("referencia")?.trim() || "";
  const valorParam = new URL(request.url).searchParams.get("valor")?.trim() || "";
  const colunaDataParam = new URL(request.url).searchParams.get("campo_data") || "shift_date";
  if (!(["shift_date", "created_at", "updated_at"] as const).includes(colunaDataParam as ColunaDataSaipos)) {
    return NextResponse.json({ error: "Campo de data Saipos inválido." }, { status: 400 });
  }
  const colunaData = colunaDataParam as ColunaDataSaipos;
  if (referenceParam.length > 80) {
    return NextResponse.json({ error: "Mesa ou comanda inválida." }, { status: 400 });
  }
  let valorAproximado: number | null = null;
  if (valorParam) {
    const valorInformado = Number(valorParam.replace(',', '.'));
    if (!Number.isFinite(valorInformado) || valorInformado < 0 || valorInformado > 100000) {
      return NextResponse.json({ error: "Valor aproximado inválido." }, { status: 400 });
    }
    valorAproximado = valorInformado;
  }
  const dia = requestedDay || new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  try {
    const { inicio, fim } = periodoDiaSaoPaulo(dia);
    // Sem referência, uma amostra limitada basta para validar token e schema.
    // Com mesa/comanda, percorremos no máximo 1.000 vendas do dia, em memória e
    // sem persistência, para retornar somente a venda operacional procurada.
    const precisaBuscaAmpla = Boolean(referenceParam || valorAproximado !== null);
    const vendasConsultadas = precisaBuscaAmpla
      ? await buscarTodasVendasSaipos({ inicio, fim, dateColumnFilter: colunaData, pageSize: 200, maxPages: 5 })
      : await buscarVendasSaipos({ inicio, fim, dateColumnFilter: colunaData, limit: 50 });
    const vendas = vendasConsultadas.filter((sale) => {
      const referenciaCorresponde = !referenceParam || correspondeReferencia(sale, normalizarReferencia(referenceParam));
      // A faixa de R$ 5,00 permite localizar uma venda cujo total foi
      // informado de memória, sem expor dados de clientes ou alterar a venda.
      const valorCorresponde = valorAproximado === null
        ? true
        : Math.abs(Number(sale.total_amount) - valorAproximado) <= 5;
      return referenciaCorresponde && valorCorresponde;
    });

    return NextResponse.json({
      ok: true,
      modo: "somente_leitura",
      dia,
      periodo: { inicio, fim },
      campo_data_consultado: colunaData,
      referencia_consultada: referenceParam || null,
      valor_aproximado_consultado: valorAproximado,
      vendas_consultadas: vendasConsultadas.length,
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

    if (error instanceof Error && error.message === "Token da API de Dados Saipos não configurado.") {
      return NextResponse.json({ error: "SAIPOS_DATA_API_TOKEN não está configurado como Secret no servidor." }, { status: 503 });
    }
    return NextResponse.json({ error: "Não foi possível executar o diagnóstico Saipos." }, { status: 500 });
  }
}
