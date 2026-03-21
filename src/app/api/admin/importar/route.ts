import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  calcularPontosEarned,
  calcularCashbackValue,
  calcularTicketsEarned,
  getNivelPorGasto,
} from '@/lib/fidelidade-rules';
import {
  successResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const ImportarVendasSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'Planilha sem linhas para importar'),
});

type ImportarVendasInput = z.infer<typeof ImportarVendasSchema>;

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

// Registrar extrato
async function registrarExtrato(cliente_id: number, pontos: number, descricao: string) {
  try {
    await supabaseAdmin.from('extrato_pontos').insert({
      cliente_id,
      tipo: 'entrada',
      valor: pontos,
      origem: 'IMPORTACAO_VENDAS',
      descricao,
      criado_em: new Date().toISOString(),
      metodo: 'importacao'
    });
  } catch (e) {
    console.log('ERRO EXTRATO:', e);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<ImportarVendasInput>(ImportarVendasSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { rows } = validacao.data;

    logInfo('/api/admin/importar', 'Iniciando importacao de vendas', {
      total_linhas: rows.length,
      requestId,
    });

    let processados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let naoEncontrados = 0;

    // Buscar TODOS clientes da base (5k)
    const { data: baseClientes, error: baseError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*');

    if (baseError) {
      logError('/api/admin/importar', baseError as Error, { requestId });
      return handleApiError(baseError, '/api/admin/importar', requestId);
    }

    if (!baseClientes) {
      throw new Error('Nao foi possivel carregar a base de clientes');
    }

    for (const row of rows) {
      try {
        const consumidor = row['Consumidor'] || row['CONSUMIDOR'] || null;
        if (!consumidor) {
          ignorados++;
          continue;
        }

        const valor = 
          parseValor(row['Valor']) ||
          parseValor(row['Itens']) ||
          parseValor(row['Total']) ||
          0;

        if (valor <= 0) {
          ignorados++;
          continue;
        }

        // --- BUSCAR CLIENTE POR NOME (SIMILARIDADE LEVE) ---
        const clienteEncontrado = baseClientes.find((c: any) =>
          nomesParecidos(c.nome, String(consumidor))
        );

        if (!clienteEncontrado) {
          naoEncontrados++;
          continue;
        }

        const cliente = clienteEncontrado;

        // ------- ATUALIZAR FIDELIDADE -------
        const totalNovo = (cliente.total_gasto || 0) + valor;
        const nivelNovo = getNivelPorGasto(totalNovo).nivel;
        const pontosGanhos = calcularPontosEarned(valor, totalNovo);
        const cashbackGanhos = Number(calcularCashbackValue(valor, totalNovo).toFixed(2));
        const ticketsGanhos = calcularTicketsEarned(valor, totalNovo);

        await supabaseAdmin
          .from('base_clientes_saipos')
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
          .eq('id', cliente.id);

        await registrarExtrato(
          cliente.id,
          pontosGanhos,
          `Compra importada: R$ ${valor.toFixed(2)}`
        );

        atualizados++;
        processados++;

      } catch (e) {
        console.log('Erro ao processar venda:', e);
      }
    }

    logInfo('/api/admin/importar', 'Importacao de vendas concluida', {
      processados,
      atualizados,
      ignorados,
      naoEncontrados,
      requestId,
    });

    return successResponse({
      processados,
      novos: 0,
      atualizados,
      ignorados,
      naoEncontrados,
      mensagem: 'Importacao de vendas concluida.',
    });
  } catch (error) {
    logError('/api/admin/importar', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/importar', requestId);
  }
}