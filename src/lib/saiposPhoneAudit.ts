import { telefoneDaVendaSaipos, type VendaSaipos } from './saipos.ts';

type VendaComTipo = VendaSaipos & { id_sale_type?: unknown };

export type ResumoTelefonesSaipos = {
  vendas: number;
  com_telefone_ddd: number;
  sem_telefone_ddd: number;
  telefones_distintos: number;
  telefones_repetidos: number;
  vendas_com_telefone_repetido: number;
  maior_repeticao: number;
};

/** Expõe só a estrutura dos campos, nunca o conteúdo de contato. */
export function diagnosticarFormatoTelefoneSaipos(venda: VendaComTipo) {
  const raw = venda as Record<string, unknown>;
  const customer = venda.customer && typeof venda.customer === 'object' && !Array.isArray(venda.customer)
    ? venda.customer as Record<string, unknown> : null;
  const candidatos = [
    ['customer.phone', customer?.phone],
    ['customer_phone', venda.customer_phone],
    ['telefone', venda.telefone],
  ] as const;
  return {
    campos_cliente: customer ? Object.keys(customer).sort() : [],
    campos_raiz_com_telefone: Object.keys(raw).filter((campo) => /phone|tel/i.test(campo)).sort(),
    campos_esperados: candidatos.map(([campo, valor]) => {
      const texto = Array.isArray(valor) ? valor[0] : valor;
      return {
        campo,
        presente: texto !== null && texto !== undefined && String(texto).trim().length > 0,
        quantidade_digitos: typeof texto === 'string' ? texto.replace(/\D/g, '').length : null,
      };
    }),
  };
}

function resumir(vendas: VendaComTipo[]): ResumoTelefonesSaipos {
  const frequencias = new Map<string, number>();
  let semTelefone = 0;
  for (const venda of vendas) {
    const telefone = telefoneDaVendaSaipos(venda);
    if (!telefone) {
      semTelefone += 1;
      continue;
    }
    frequencias.set(telefone, (frequencias.get(telefone) || 0) + 1);
  }
  const repetidos = [...frequencias.values()].filter((quantidade) => quantidade > 1);
  return {
    vendas: vendas.length,
    com_telefone_ddd: vendas.length - semTelefone,
    sem_telefone_ddd: semTelefone,
    telefones_distintos: frequencias.size,
    telefones_repetidos: repetidos.length,
    vendas_com_telefone_repetido: repetidos.reduce((soma, quantidade) => soma + quantidade, 0),
    maior_repeticao: Math.max(0, ...frequencias.values()),
  };
}

/** Retorna somente agregados. Nenhum telefone, nome ou CPF sai deste módulo. */
export function auditarTelefonesSaipos(vendas: VendaComTipo[]) {
  const porTipo = new Map<string, VendaComTipo[]>();
  for (const venda of vendas) {
    const tipo = Number(venda.id_sale_type);
    const chave = Number.isSafeInteger(tipo) && tipo >= 0 ? String(tipo) : 'desconhecido';
    const grupo = porTipo.get(chave) || [];
    grupo.push(venda);
    porTipo.set(chave, grupo);
  }
  return {
    geral: resumir(vendas),
    por_tipo: Object.fromEntries([...porTipo.entries()].map(([tipo, grupo]) => [tipo, resumir(grupo)])),
  };
}
