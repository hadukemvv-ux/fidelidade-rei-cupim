import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getNivelPorGasto, calcularProgressaoNivel } from '@/lib/fidelidade-rules';
import { validarDados, ResgateSchema, type ResgateValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError, checkRateLimit } from '@/lib/api-utils';
import crypto from 'crypto';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { attachCustomerSession } from '@/lib/customerSession';

// =========================
// HELPERS
// =========================

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
type ResgateCliente = {
  nome?: string | null;
  data_nascimento?: string | null;
  email?: string | null;
  telefone?: string | null;
  pin_hash?: string | null;
};

function isPreCadastro(cliente: ResgateCliente) {
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

    // O primeiro POST sem tipo funciona como login por PIN. Operações que
    // alteram saldo exigem também a sessão HttpOnly emitida após esse login.
    if (tipo) {
      const authError = await validateCustomerAuth(req, telefone);
      if (authError) return authError;
    } else {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      if (!checkRateLimit(`customer-login:${clientIp}:${telefone}`, 10, 15 * 60)) {
        return errorResponse('Muitas tentativas. Aguarde 15 minutos e tente novamente.', 'unauthorized', 429);
      }
    }

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
      return attachCustomerSession(successResponse(snap), telefone);
    }

    // ========== RESGATE PROPRIAMENTE DITO ==========

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

    // Débito, limite diário, cupom e auditoria são confirmados juntos.
    const { error: resgateError } = await supabaseAdmin.rpc('resgatar_beneficio_fidelidade', {
      p_telefone: telefone,
      p_tipo: tipo,
      p_custo_pontos: custoPontos,
      p_custo_cash: custoCash,
      p_premio_nome: nomePremio,
      p_codigo: codigo,
      p_produto_id: produtoId || null,
    });

    if (resgateError) {
      const mensagem = resgateError.message || 'Falha ao processar resgate';
      if (/limite|saldo|custo|tipo/i.test(mensagem)) {
        return errorResponse(mensagem, 'validation_error');
      }
      return handleApiError(resgateError, '/api/resgate', requestId);
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
