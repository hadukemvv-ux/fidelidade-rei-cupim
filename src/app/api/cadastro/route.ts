import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validarDados, ClienteSchema, type ClienteValidation } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';
import { validateCustomerAuth } from '@/app/api/_utils/validateCustomerAuth';
import { hashPin, isLegacyAutomaticPin, verifyPin } from '@/lib/pin';

function iso() {
  return new Date().toISOString();
}

// Detectar PRÉ‑CADASTRO (roleta)
type CadastroCliente = {
  nome?: string | null;
  data_nascimento?: string | null;
  email?: string | null;
  telefone?: string | null;
  pin_hash?: string | null;
};

function isPreCadastro(cliente: CadastroCliente) {
  const nome = cliente?.nome || '';
  const dataNasc = cliente?.data_nascimento;
  const email = cliente?.email;
  const telefone = cliente.telefone || '';
  const pin_hash = cliente?.pin_hash;

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !dataNasc ||
    !email ||
    isLegacyAutomaticPin(telefone, pin_hash)
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

    logInfo('/api/cadastro', 'Iniciando cadastro', {
      telefone: `****${telefone.slice(-4)}`,
      requestId,
    });

    // ===== 2. VALIDAR PIN (4 dígitos) =====
    if (!pin || !/^\d{4}$/.test(pin)) {
      return errorResponse('PIN deve ter exatamente 4 dígitos', 'validation_error');
    }

    // ===== 3. BUSCAR CLIENTE PELO TELEFONE =====
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
      return errorResponse(
        'Confirme este WhatsApp com o atendimento antes de criar sua conta.',
        'unauthorized',
        403,
        requestId
      );
    }

    // Um telefone já existente só pode ser alterado por uma sessão que
    // pertença ao próprio cliente. Cadastros novos continuam públicos.
    const authError = await validateCustomerAuth(req, telefone);
    if (authError) return authError;

    // A consulta de e-mail só acontece depois da autenticação, evitando
    // transformar o cadastro público em um enumerador de contas.
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('base_clientes_saipos')
      .select('id, telefone')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      logError('/api/cadastro', emailError as Error, { requestId });
      return handleApiError(emailError, '/api/cadastro', requestId);
    }

    if (emailExistente && emailExistente.telefone !== telefone) {
      return errorResponse('Este email já está cadastrado em outra conta', 'validation_error');
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
          updateData.pin_hash = await hashPin(pin);
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

      const verificacaoPin = await verifyPin(pin, cliente.pin_hash);
      if (!verificacaoPin.valid) {
        logInfo('/api/cadastro', 'PIN incorreto para cliente existente', {
          telefone: `****${telefone.slice(-4)}`,
          requestId,
        });
        return errorResponse('PIN incorreto', 'unauthorized');
      }

      if (verificacaoPin.needsRehash) {
        await supabaseAdmin
          .from('base_clientes_saipos')
          .update({ pin_hash: await hashPin(pin), atualizado_em: iso() })
          .eq('id', cliente.id);
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
