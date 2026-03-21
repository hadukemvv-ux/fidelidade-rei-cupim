import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados } from '@/lib/validations';
import {
  successResponse,
  validationErrorResponse,
  getRequestId,
  logInfo,
  logError,
  handleApiError,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const ImportarClientesSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'Planilha sem linhas para importar'),
});

type ImportarClientesInput = z.infer<typeof ImportarClientesSchema>;

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

function parseDataParaISO(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;

    // Excel serial date (dias desde 1899-12-30)
    if (value > 20000 && value < 100000) {
      const excelEpochUtc = Date.UTC(1899, 11, 30);
      const millis = excelEpochUtc + Math.round(value * 86400000);
      const parsedExcelDate = new Date(millis);
      return Number.isNaN(parsedExcelDate.getTime()) ? null : parsedExcelDate.toISOString();
    }

    const parsedNumberDate = new Date(value);
    return Number.isNaN(parsedNumberDate.getTime()) ? null : parsedNumberDate.toISOString();
  }

  if (typeof value === 'string') {
    const texto = value.trim();
    if (!texto) return null;

    const parsed = new Date(texto);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    const brDate = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brDate) {
      const dia = Number(brDate[1]);
      const mes = Number(brDate[2]) - 1;
      const anoBruto = Number(brDate[3]);
      const ano = anoBruto < 100 ? 2000 + anoBruto : anoBruto;
      const parsedBr = new Date(Date.UTC(ano, mes, dia));
      return Number.isNaN(parsedBr.getTime()) ? null : parsedBr.toISOString();
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  const authError = await validateAdminAuth(req, new URL(req.url));
  if (authError) return authError;

  try {
    const body = await req.json();
    const validacao = validarDados<ImportarClientesInput>(ImportarClientesSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { rows } = validacao.data;

    let processados = 0;
    let novos = 0;
    let atualizados = 0;
    let ignorados = 0;

    logInfo('/api/admin/importar-clientes', 'Iniciando importacao de clientes', {
      total_linhas: rows.length,
      requestId,
    });

    for (const row of rows) {
      try {
        // CAMPOS DA PLANILHA DE CLIENTES SAIPOS
        const nome = row['Nome'] || row['Cliente'] || row['Consumidor'] || null;
        const telefone = limparTel(
          String(row['Telefone'] || row['Celular'] || row['WhatsApp'] || row['Contato'] || '')
        );
        const email = row['Email'] || null;
        const cpf = row['CPF/CNPJ'] || row['CPF'] || null;
        const dataNascIso = parseDataParaISO(row['Data Aniversario'] || row['Data Aniversário'] || null);

        const qtdPedidos = parseInt(String(row['Qtd. Pedidos'] || 0), 10);
        const totalGasto = parseMoeda(row['Valor Total'] || 0);
        const ultimaCompra = row['Ultima Compra'] || row['Última Compra'] || null;
        const ultimaCompraIso = parseDataParaISO(ultimaCompra);

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
          .from('base_clientes_saipos')
          .select('*')
          .eq('telefone', telefone)
          .maybeSingle();

        // ============================================================
        // === 1) CLIENTE NÃO EXISTE → CRIAR NOVO ====================
        // ============================================================
        if (!existente) {
          const { data: criado, error: erroInsert } = await supabaseAdmin
            .from('base_clientes_saipos')
            .insert({
              nome,
              telefone,
              email,
              cpf,
              data_nascimento: dataNascIso,

              // Dados estruturais vindos da Saipos
              total_gasto: totalGasto,
              qtd_pedidos: qtdPedidos,
              primeira_compra: ultimaCompraIso,
              ultima_compra: ultimaCompraIso,

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
            console.error('Erro ao criar cliente:', erroInsert);
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
          data_nascimento: dataNascIso || existente.data_nascimento,

          // Dados estruturais (SOMENTE do relatório de clientes)
          total_gasto: totalGasto || existente.total_gasto,
          qtd_pedidos: qtdPedidos || existente.qtd_pedidos,
          ultima_compra: ultimaCompraIso || existente.ultima_compra,

          // NÃO ALTERAMOS:
          // pontos, cashback, tickets, nivel

          atualizado_em: new Date().toISOString()
        };

        await supabaseAdmin
          .from('base_clientes_saipos')
          .update(atualiza)
          .eq('id', existente.id);

        atualizados++;
        processados++;
      } catch (erroLinha) {
        console.error('Erro ao processar linha:', erroLinha);
      }
    }

    logInfo('/api/admin/importar-clientes', 'Importacao de clientes concluida', {
      processados,
      novos,
      atualizados,
      ignorados,
      requestId,
    });

    return successResponse({
      processados,
      novos,
      atualizados,
      ignorados,
      mensagem: 'Importacao de clientes concluida.',
    });
  } catch (error) {
    logError('/api/admin/importar-clientes', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/importar-clientes', requestId);
  }
}