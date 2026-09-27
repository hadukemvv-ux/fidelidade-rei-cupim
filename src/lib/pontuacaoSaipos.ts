import { telefoneDaVendaSaipos, type VendaSaipos } from './saipos.ts';
import { isLegacyAutomaticPin } from './pin.ts';

export type ContaCandidata = {
  id: number;
  telefone: string | null;
  telefone_verificado_em: string | null;
  pin_hash: string | null;
};

export type IdentificacaoPontuacao =
  | { status: 'identificada'; clienteId: number }
  | { status: 'sem_telefone' | 'sem_cadastro' | 'nao_verificada' | 'ambiguo' };

/** CPF e nome da Saipos não provam a titularidade de uma conta do Clube. */
export function identificarContaParaPontuacao(
  venda: VendaSaipos,
  candidatas: ContaCandidata[],
): IdentificacaoPontuacao {
  const telefone = telefoneDaVendaSaipos(venda);
  if (!telefone) return { status: 'sem_telefone' };

  const encontradas = candidatas.filter((conta) => conta.telefone === telefone);
  if (encontradas.length === 0) return { status: 'sem_cadastro' };
  if (encontradas.length !== 1) return { status: 'ambiguo' };

  const conta = encontradas[0];
  if (!Number.isSafeInteger(conta.id) || conta.id <= 0 ||
      !conta.telefone_verificado_em || !Number.isFinite(Date.parse(conta.telefone_verificado_em)) ||
      !conta.pin_hash || isLegacyAutomaticPin(telefone, conta.pin_hash)) {
    return { status: 'nao_verificada' };
  }

  return { status: 'identificada', clienteId: conta.id };
}

export type CompraElegivel = {
  valor: number;
  ocorreuEm: string;
};

/** Soma apenas compras no intervalo (instante - 90 dias, instante]. */
export function calcularGastoMovel90Dias(compras: CompraElegivel[], instante: Date): number {
  const fim = instante.getTime();
  if (!Number.isFinite(fim)) throw new Error('Instante de referência inválido.');
  const inicio = fim - 90 * 86_400_000;
  let centavos = 0;

  for (const compra of compras) {
    const ocorreuEm = Date.parse(compra.ocorreuEm);
    if (!Number.isFinite(ocorreuEm) || !Number.isFinite(compra.valor) || compra.valor < 0) {
      throw new Error('Compra elegível inválida.');
    }
    if (ocorreuEm > inicio && ocorreuEm <= fim) {
      centavos += Math.round(compra.valor * 100);
    }
  }

  return centavos / 100;
}
