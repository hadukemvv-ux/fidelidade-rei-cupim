import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calcularProgressaoNivel, CUSTO_ENTREGA_GRATIS_PONTOS } from '@/lib/fidelidade-rules';
import { validarDados, ResgateSchema, type ResgateValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError, checkRateLimit } from '@/lib/api-utils';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { attachCustomerSession, getCustomerSessionFromRequest } from '@/lib/customerSession';
import { hashPin, verifyPin } from '@/lib/pin';
import { isPreCadastro } from '@/lib/customerRegistration';

// =========================
// HELPERS
// =========================

function gerarCodigoCupom() {
  return 'CUP' + Math.random().toString(36).slice(2, 8).toUpperCase();
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
  const progressao = calcularProgressaoNivel(gastoAtual);

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
      atual: progressao.nivel,
      proximo: progressao.proximoNivel,
      progresso: progressao.progresso?.percentual ?? 100,
      faltamReais: progressao.progresso?.gastoFaltante ?? 0,
      multiplicadorAtual: progressao.beneficio.pontos,
    },
  };
}

export async function GET(req: NextRequest) {
  const session = getCustomerSessionFromRequest(req);
  if (!session) return errorResponse('Sessão não encontrada.', 'unauthorized', 401);

  try {
    return successResponse(await buscarSnapshot(session.phone));
  } catch {
    return errorResponse('Não foi possível restaurar sua sessão.', 'unauthorized', 401);
  }
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

      if (!cliente.pin_hash) {
        return errorResponse('Crie sua senha no cadastro', 'unauthorized');
      }

      const inicioJanela = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: falhasRecentes, error: falhasError } = await supabaseAdmin
        .from('saipos_cron_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'pin_incorreto')
        .eq('id_cliente', cliente.id)
        .gte('criado_em', inicioJanela);

      if (!falhasError && (falhasRecentes || 0) >= 10) {
        return errorResponse('Muitas tentativas. Aguarde 15 minutos e tente novamente.', 'unauthorized', 429);
      }

      const verificacaoPin = await verifyPin(pin, cliente.pin_hash);
      if (!verificacaoPin.valid) {
        await supabaseAdmin.from('saipos_cron_logs').insert({
          tipo: 'pin_incorreto',
          mensagem: 'Tentativa de PIN incorreto bloqueada pelo login do cliente',
          id_cliente: cliente.id,
          criado_em: new Date().toISOString(),
        });
        logInfo('/api/resgate', 'PIN incorreto para cliente', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });
        return errorResponse('PIN incorreto', 'unauthorized');
      }

      if (verificacaoPin.needsRehash) {
        const { error: migrationError } = await supabaseAdmin
          .from('base_clientes_saipos')
          .update({ pin_hash: await hashPin(pin), atualizado_em: new Date().toISOString() })
          .eq('id', cliente.id);
        if (migrationError) {
          logError('/api/resgate', migrationError as Error, { cliente_id: cliente.id, requestId });
        }
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
      custoPontos = CUSTO_ENTREGA_GRATIS_PONTOS;
      nomePremio = 'Taxa de entrega grátis';

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
      return errorResponse('Tipo de resgate inválido (frete, cashback, pontos, produto)', 'validation_error');
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
