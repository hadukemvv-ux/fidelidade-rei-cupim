import type { VendaSaipos } from '@/lib/saipos';

type Objeto = Record<string, unknown>;

export type ResultadoReconciliacao = {
  compativel: boolean;
  motivo: string | null;
  detalhes: {
    id_sale: string | null;
    total_saipos: number | null;
    cancelada: boolean;
    pagamento_total: number | null;
    tipos_pagamento: string[];
    atualizada_em: string | null;
  };
};

function objeto(value: unknown): Objeto | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Objeto : null;
}

function numero(value: unknown) {
  const convertido = Number(value);
  return Number.isFinite(convertido) ? Math.round(convertido * 100) / 100 : null;
}

function texto(value: unknown) {
  return typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value);
}

function vendaEstaCancelada(value: unknown) {
  return ['s', 'sim', 'true', '1', 'cancelada', 'cancelado'].includes(texto(value).toLowerCase());
}

/**
 * Compara somente campos operacionais da venda. Não traz cliente, telefone,
 * CPF, endereço nem o payload original da Saipos para o banco do Clube.
 */
export function compararComandaComVenda(
  idPedido: string,
  valorConfirmado: number,
  venda: VendaSaipos | undefined,
): ResultadoReconciliacao | null {
  if (!venda || texto(venda.id_sale) !== idPedido) return null;

  const raw = venda as Objeto;
  const pagamentos = Array.isArray(raw.payments) ? raw.payments.map(objeto).filter((item): item is Objeto => Boolean(item)) : [];
  const valoresPagamento = pagamentos.map((pagamento) => numero(pagamento.payment_amount)).filter((valor): valor is number => valor !== null);
  const pagamentoTotal = valoresPagamento.length ? Math.round(valoresPagamento.reduce((soma, valor) => soma + valor, 0) * 100) / 100 : null;
  const totalSaipos = numero(venda.total_amount);
  const cancelada = vendaEstaCancelada(venda.canceled);
  const motivos: string[] = [];

  if (cancelada) motivos.push('A venda aparece cancelada na Saipos.');
  if (totalSaipos === null || Math.abs(totalSaipos - valorConfirmado) > 0.01) motivos.push('O total da Saipos não confere com o valor confirmado na comanda.');
  if (pagamentoTotal === null || Math.abs(pagamentoTotal - valorConfirmado) > 0.01) motivos.push('A soma das formas de pagamento não confirma o total da comanda.');

  return {
    compativel: motivos.length === 0,
    motivo: motivos.length ? motivos.join(' ') : null,
    detalhes: {
      id_sale: texto(venda.id_sale) || null,
      total_saipos: totalSaipos,
      cancelada,
      pagamento_total: pagamentoTotal,
      tipos_pagamento: pagamentos.map((pagamento) => texto(pagamento.desc_store_payment_type)).filter(Boolean).slice(0, 5),
      atualizada_em: texto(raw.updated_at) || null,
    },
  };
}
