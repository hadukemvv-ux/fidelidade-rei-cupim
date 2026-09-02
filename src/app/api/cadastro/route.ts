import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados, ClienteSchema, type ClienteValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import crypto from 'crypto';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';

// Helpers
function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function iso() {
  return new Date().toISOString();
}

function validarEmail(email?: string | null) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(e) ? e : null;
}

function validarDataNascimento(str?: string | null) {
  if (!str) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  const ano = d.getFullYear();
  const hoje = new Date();

  if (ano < 1920) return null;
  if (d > hoje) return null;

  return str;
}

async function registrarExtrato(cliente_id: number, valor: number, descricao: string) {
  try {
    await supabaseAdmin.from('extrato_pontos').insert({
      cliente_id,
      tipo: 'entrada',
      valor,
      origem: 'SISTEMA',
      descricao,
      criado_em: iso(),
      metodo: 'cadastro'
    });
  } catch (e) {
    console.log('⚠️ Extrato falhou:', e);
  }
}

// Detectar PRÉ‑CADASTRO (roleta)
function isPreCadastro(cliente: any) {
  const nome = cliente?.nome || '';
  const dataNasc = cliente?.data_nascimento;
  const email = cliente?.email;
  const telefone = cliente?.telefone;
  const pin_hash = cliente?.pin_hash;

  // PIN automático gerado pela roleta
  let pinAutoHash = null;
  if (telefone?.length >= 4) {
    const autoPin = telefone.substring(0, 4);
    pinAutoHash = crypto.createHash('sha256').update(autoPin).digest('hex');
  }

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !dataNasc ||
    !email ||
    (pinAutoHash && pin_hash === pinAutoHash)
  );
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body = await req.json();

    // ===== 1. VALIDAÇÃO COM ZOD =====
    const validacao = validarDados<ClienteValidation>(ClienteSchema, body);
    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const { telefone, nome, email, data_nascimento, pin } = validacao.data;

    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;

    logInfo('/api/cadastro', 'Iniciando cadastro', {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    // ===== 2. VALIDAR PIN (4 dígitos) =====
    if (!pin || !/^\d{4}$/.test(pin)) {
      return errorResponse('PIN deve ter exatamente 4 dígitos', 'validation_error');
    }

    const pin_hash = crypto.createHash('sha256').update(pin).digest('hex');

    // ===== 3. CHECAR EMAIL DUPLICADO =====
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      logError('/api/cadastro', emailError as Error, {
        requestId,
      });
      return handleApiError(emailError, '/api/cadastro', requestId);
    }

    if (emailExistente && emailExistente.telefone !== telefone) {
      return errorResponse('Este email já está cadastrado em outra conta', 'validation_error');
    }

    // ===== 4. BUSCAR CLIENTE PELO TELEFONE =====
    const { data: encontrados, error: searchError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('*')
      .eq('telefone', telefone);

    if (searchError) {
      logError('/api/cadastro', searchError as Error, {
        requestId,
      });
      return handleApiError(searchError, '/api/cadastro', requestId);
    }

    // ===== CASO 1: NOVO CLIENTE =====
    if (!encontrados || encontrados.length === 0) {
      const bonus = data_nascimento ? 200 : 0;

      const { data: novo, error: insertError } = await supabaseAdmin
        .from('base_clientes_saipos')
        .insert({
          nome,
          email,
          telefone,
          pin_hash,
          data_nascimento: data_nascimento || null,
          pontos: bonus,
          cashback: 0,
          tickets: 0,
          nivel: 'BRONZE',
          total_gasto: 0,
          qtd_pedidos: 0,
          primeira_compra: null,
          ultima_compra: null,
          atualizado_em: iso(),
        })
        .select('id')
        .single();

      if (insertError) {
        logError('/api/cadastro', insertError as Error, {
          requestId,
        });
        return handleApiError(insertError, '/api/cadastro', requestId);
      }

      // Registrar bonus
      if (bonus > 0) {
        await registrarExtrato(novo.id, bonus, 'Bônus de Cadastro');
      }

logInfo('/api/cadastro', 'Novo cliente criado', {
        telefone: `****${telefone.slice(-4)}`,
        bonus,
        requestId,
      });

      return successResponse({
        criado: true,
        message: 'Cadastro realizado com sucesso!',
        bonus: bonus > 0 ? `+${bonus} pontos de bônus` : undefined,
      });
    }

    // ===== CASO 2: CLIENTE EXISTENTE =====
    if (encontrados.length === 1) {
      const cliente = encontrados[0];
      const preCadastro = isPreCadastro(cliente);

      // Se é pré-cadastro, pode completar dados
      if (preCadastro) {
        const updateData: Record<string, unknown> = { atualizado_em: iso() };

        if (!cliente.nome || cliente.nome === 'Cliente Novo (Roleta)') {
          updateData.nome = nome;
        }
        if (!cliente.email) {
          updateData.email = email;
        }
        if (!cliente.data_nascimento) {
          updateData.data_nascimento = data_nascimento || null;
        }
        if (!cliente.pin_hash) {
          updateData.pin_hash = pin_hash;
        }

        const { error: updateError } = await supabaseAdmin
          .from('base_clientes_saipos')
          .update(updateData)
          .eq('id', cliente.id);

        if (updateError) {
          logError('/api/cadastro', updateError as Error, {
            requestId,
          });
          return handleApiError(updateError, '/api/cadastro', requestId);
        }

        logInfo('/api/cadastro', 'Pré-cadastro completado', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });

        return successResponse({
          atualizado: true,
          message: 'Cadastro completado com sucesso!',
        });
      }

      // Se já é cliente completo, validar dados
      if (cliente.nome !== nome) {
        return errorResponse('Este número já tem cadastro. Nome não pode ser alterado.', 'validation_error');
      }

      if (cliente.data_nascimento && cliente.data_nascimento !== data_nascimento) {
        return errorResponse('Data de nascimento não pode ser alterada', 'validation_error');
      }

      if (cliente.email && cliente.email !== email) {
        return errorResponse('Email não pode ser alterado após cadastro completo', 'validation_error');
      }

      if (cliente.pin_hash && cliente.pin_hash !== pin_hash) {
        logInfo('/api/cadastro', 'PIN incorreto para cliente existente', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });
        return errorResponse('PIN incorreto', 'unauthorized');
      }

      return successResponse({
        message: 'Cadastro já existe com estes dados. Você pode fazer login.',
      });
    }

    // ===== CASO 3: DUPLICADOS =====
    // Se houver múltiplos clientes, unificar (manter o primeiro)
    const ids = encontrados.map((c) => c.id);
    const paraExcluir = ids.slice(1);

    const { error: deleteError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .delete()
      .in('id', paraExcluir);

    if (deleteError) {
      logError('/api/cadastro', deleteError as Error, {
        requestId,
      });
      return handleApiError(deleteError, '/api/cadastro', requestId);
    }

    logInfo('/api/cadastro', `Unificados ${paraExcluir.length} clientes duplicados`, {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    return successResponse({
      unificado: true,
      message: 'Cadastros unificados. Faça login novamente.',
    });

  } catch (error) {
    logError('/api/cadastro', error instanceof Error ? error : new Error(String(error)), {
      requestId: getRequestId(req),
    });
    return handleApiError(error, '/api/cadastro', requestId);
  }
}
