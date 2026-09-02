import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getNivelPorGasto, calcularProgressaoNivel } from '@/lib/fidelidade-rules';
import { validarDados, ResgateSchema, type ResgateValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import crypto from 'crypto';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';

// =========================
// HELPERS
// =========================

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isoNow() {
  return new Date().toISOString();
}

function gerarCodigoCupom() {
  return 'CUP' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function calcularNivel(gastoTotal: number) {
  const nivelInfo = getNivelPorGasto(gastoTotal);
  return {
    atual: nivelInfo.nivel,
    proximo: calcularProgressaoNivel(gastoTotal).proximoNivel,
    min: nivelInfo.gastoMinimo,
    max: nivelInfo.gastoMaximo || 999999,
    multiplicador: nivelInfo.beneficio.pontos,
  };
}

// ———————————————————————
// DETECTAR SE É PRÉ‑CADASTRO (AGORA INCLUINDO EMAIL)
// ———————————————————————
function isPreCadastro(cliente: any) {
  const nome = cliente?.nome || '';
  const dataNasc = cliente?.data_nascimento;
  const email = cliente?.email;
  const telefone = cliente?.telefone || '';
  const pin_hash = cliente?.pin_hash;

  let pinAutoHash = null;
  if (telefone.length >= 4) {
    const autoPin = telefone.substring(0, 4);
    pinAutoHash = crypto.createHash('sha256').update(autoPin).digest('hex');
  }

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !dataNasc ||
    !email ||
    (pin_hash && pin_hash === pinAutoHash)
  );
}


// =========================
// SNAPSHOT
// =========================
async function buscarSnapshot(telefone: string) {
  const { data: cliente } = await supabaseAdmin
    .from('base_clientes_saipos')
    .select('*')
    .eq('telefone', telefone)
    .maybeSingle();

  if (!cliente) throw new Error('Cliente não encontrado.');

  const gastoAtual = Number(cliente.gasto_90_dias ?? cliente.total_gasto ?? 0);
  const nivel = calcularNivel(gastoAtual);

  let progresso = 0;
  let faltamReais = 0;

  if (nivel.atual !== 'REI') {
    const intervalo = nivel.max - nivel.min;
    progresso = Math.floor(((gastoAtual - nivel.min) / intervalo) * 100);
    progresso = Math.max(0, Math.min(100, progresso));
    faltamReais = Math.max(0, nivel.max - gastoAtual);
  } else {
    progresso = 100;
  }

  return {
    cliente: {
      nome: cliente.nome,
      telefone,
      email: cliente.email || null,
      data_nascimento: cliente.data_nascimento || null,
    },
    pontos: Number(cliente.pontos || 0),
    cashback: Number(cliente.cashback || 0),
    tickets: Number(cliente.tickets || 0),
    nivel: {
      atual: nivel.atual,
      proximo: nivel.proximo,
      progresso,
      faltamReais,
      multiplicadorAtual: nivel.multiplicador,
    },
  };
}


// =========================
// POST — CONSULTA OU RESGATE
// =========================

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  
  try {
    const body = await req.json();
    
    // Validar entrada com Zod
    const validacao = validarDados<ResgateValidation>(ResgateSchema, body);

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { telefone, pin, tipo, valor, valorDesconto, produtoId } = validacao.data;

    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;

    logInfo('/api/resgate', 'Iniciando resgate', {
      telefone: `****${telefone.slice(-4)}`,
      tipo: tipo || 'consulta',
      requestId,
    });

    // 1. Buscar cliente
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    if (clienteError) {
      logError('/api/resgate', clienteError as Error, {
        requestId,
      });
      return handleApiError(clienteError, '/api/resgate', requestId);
    }

    if (!cliente) {
      return errorResponse('Cliente não encontrado', 'not_found');
    }

    // 2. DETECÇÃO PRÉ-CADASTRO
    const preCadastro = isPreCadastro(cliente);

    if (preCadastro) {
      // Pré-cadastro nunca pode consultar saldo nem resgatar antes de comprovar o telefone.
      return successResponse({
        ok: true,
        pre_cadastro: true,
        motivo: 'Seu cadastro foi iniciado pela Roleta. Para acessar sua conta, finalize seus dados.',
      });
    }

    // 3. VALIDAR PIN (para clientes completos)
    if (!preCadastro) {
      if (!pin || pin.length !== 4) {
        return errorResponse('PIN deve ter 4 dígitos', 'validation_error');
      }

      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

      if (!cliente.pin_hash) {
        return errorResponse('Crie sua senha no cadastro', 'unauthorized');
      }

      if (cliente.pin_hash !== pinHash) {
        logInfo('/api/resgate', 'PIN incorreto para cliente', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });
        return errorResponse('PIN incorreto', 'unauthorized');
      }
    }

    // 4. CONSULTA SEM RESGATE (GET snapshot)
    if (!tipo) {
      const snap = await buscarSnapshot(telefone);
      return successResponse(snap);
    }

    // ========== RESGATE PROPRIAMENTE DITO ==========

    const hoje = new Date().toISOString().split('T')[0];

    // Verificar limite diário
    const { data: jaResgatou, error: resgateCheckError } = await supabaseAdmin
      .from('resgates')
      .select('id')
      .eq('telefone', telefone)
      .gte('criado_em', `${hoje}T00:00:00`)
      .limit(1);

    if (resgateCheckError) {
      logError('/api/resgate', resgateCheckError as Error, {
        requestId,
      });
      return handleApiError(resgateCheckError, '/api/resgate', requestId);
    }

    if (jaResgatou && jaResgatou.length > 0) {
      return errorResponse('Limite de 1 resgate por dia atingido', 'validation_error');
    }

    const antes = await buscarSnapshot(telefone);
    let custoPontos = 0;
    let custoCash = 0;
    let nomePremio = '';
    const codigo = gerarCodigoCupom();

    // ===== VALIDAR TIPO E CALCULAR CUSTO =====
    if (tipo === 'frete') {
      custoPontos = 200;
      nomePremio = 'Entrega Grátis';

    } else if (tipo === 'cashback') {
      const valorCashback = Number(valorDesconto || valor || 0);
      if (![5, 10, 15].includes(valorCashback)) {
        return errorResponse('Valores aceitos: 5, 10, 15', 'validation_error');
      }
      custoCash = valorCashback;
      nomePremio = `Desconto R$ ${valorCashback}`;

    } else if (tipo === 'pontos') {
      // Resgate customizado de pontos
      const pontosResgatar = valor || 0;
      if (pontosResgatar <= 0 || pontosResgatar > 10000) {
        return errorResponse('Pontos deve estar entre 1 e 10000', 'validation_error');
      }
      custoPontos = pontosResgatar;
      nomePremio = `${pontosResgatar} pontos resgatados`;

    } else if (tipo === 'produto') {
      if (!produtoId) {
        return errorResponse('Produto inválido para resgate', 'validation_error');
      }

      const { data: produto, error: produtoError } = await supabaseAdmin
        .from('produtos_loja')
        .select('id, nome, custo_em_pontos, destaque, ativo')
        .eq('id', produtoId)
        .maybeSingle();

      if (produtoError) {
        logError('/api/resgate', produtoError as Error, {
          produtoId,
          requestId,
        });
        return handleApiError(produtoError, '/api/resgate', requestId);
      }

      if (!produto || produto.ativo === false) {
        return errorResponse('Produto não encontrado ou indisponível', 'not_found', 404);
      }

      const custoBase = Number(produto.custo_em_pontos || 0);
      if (custoBase <= 0) {
        return errorResponse('Produto com custo inválido', 'validation_error');
      }

      custoPontos = produto.destaque ? Math.floor(custoBase * 0.5) : custoBase;
      nomePremio = produto.nome || 'Produto';

    } else {
      return errorResponse('Tipo de resgate inválido (frete, cashback, pontos)', 'validation_error');
    }

    // ===== VALIDAR SALDOS =====
    if (custoPontos > 0 && antes.pontos < custoPontos) {
      return errorResponse(
        `Saldo insuficiente. Você tem ${antes.pontos} pontos, precisa de ${custoPontos}`,
        'validation_error'
      );
    }

    if (custoCash > 0 && antes.cashback < custoCash) {
      return errorResponse(
        `Cashback insuficiente. Você tem R$ ${antes.cashback.toFixed(2)}, precisa de R$ ${custoCash}`,
        'validation_error'
      );
    }

    // ===== ATUALIZAR SALDOS =====
    const novoSaldo = {
      atualizado_em: isoNow(),
      pontos: custoPontos > 0 ? antes.pontos - custoPontos : antes.pontos,
      cashback: custoCash > 0 ? antes.cashback - custoCash : antes.cashback,
    };

    const { error: updErr } = await supabaseAdmin
      .from('base_clientes_saipos')
      .update(novoSaldo)
      .eq('telefone', telefone);

    if (updErr) {
      logError('/api/resgate', updErr as Error, {
        requestId,
      });
      return handleApiError(updErr, '/api/resgate', requestId);
    }

    // ===== REGISTRAR RESGATE =====
    const { error: registroErr } = await supabaseAdmin
      .from('resgates')
      .insert({
        telefone,
        tipo,
        valor: custoCash > 0 ? custoCash : custoPontos,
        premio_nome: nomePremio,
        codigo,
        criado_em: isoNow(),
        status: 'processado',
        produto_id: produtoId || null,
      });

    if (registroErr) {
      logError('/api/resgate', registroErr as Error, {
        requestId,
      });
      return handleApiError(registroErr, '/api/resgate', requestId);
    }

    const depois = await buscarSnapshot(telefone);

    logInfo('/api/resgate', `Resgate ${tipo} concluído`, {
      telefone: `****${telefone.slice(-4)}`,
      codigo,
      requestId,
    });

    return successResponse({
      codigo,
      atualizado: depois,
      resumo: {
        tipo,
        nomePremio,
        custoPontos,
        custoCash,
      },
    });

  } catch (error) {
    logError('/api/resgate', error instanceof Error ? error : new Error(String(error)), {
      requestId: getRequestId(req),
    });
    return handleApiError(error, '/api/resgate', requestId);
  }
}
