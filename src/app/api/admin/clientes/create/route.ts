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

function gerarCpfFake() {
  return String(Math.floor(10000000000 + Math.random() * 89999999999));
}

function gerarHashFake() {
  const chars = 'ABCDEF0123456789';
  let h = '';
  for (let i = 0; i < 40; i++) {
    h += chars[Math.floor(Math.random() * chars.length)];
  }
  return h;
}

function gerarEmail(nome: string) {
  const safe = nome.toLowerCase().replace(/\s+/g, '');
  return `${safe}${Math.floor(Math.random() * 9999)}@example.com`;
}

const ClienteCreateSchema = z.object({
  nome: z.string().trim().min(3).max(255).optional(),
  telefone: z.string().regex(/^\d{10,11}$/).optional(),
  tickets: z.coerce.number().int().min(0).max(100000).optional(),
  cpf: z.string().regex(/^\d{11}$/).optional(),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nivel: z.enum(['BRONZE', 'PRATA', 'OURO', 'REI']).optional(),
  email: z.string().email().optional(),
});

type ClienteCreateInput = z.infer<typeof ClienteCreateSchema>;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    const body = await request.json();
    const validacao = validarDados<ClienteCreateInput>(ClienteCreateSchema, body || {});

    if (!validacao.ok) {
      return validationErrorResponse(validacao.error);
    }

    const payload = validacao.data;

    // Campos enviados pelo teste
    const nome = payload.nome || 'Cliente Teste';
    const telefone = payload.telefone || `8599${Math.floor(Math.random() * 9999999)}`;
    const tickets = payload.tickets ?? Math.floor(Math.random() * 30) + 1;

    // Gerar fakes automáticos
    const cpf = payload.cpf || gerarCpfFake();
    const pin_hash = gerarHashFake();
    const data_nasc = payload.data_nascimento || '1990-01-01';
    const nivel = payload.nivel || 'BRONZE';
    const pontos = 0;
    const cashback = 0;
    const total_gasto = Math.floor(Math.random() * 5000);
    const qtd_pedidos = Math.floor(Math.random() * 25);
    const email = payload.email || gerarEmail(nome);

    logInfo('/api/admin/clientes/create', 'Criando cliente de teste via admin', {
      telefone_final: `****${telefone.slice(-4)}`,
      requestId,
    });

    const { data, error } = await supabaseAdmin
      .from('base_clientes_saipos')
      .insert({
        nome,
        telefone,
        cpf,
        atualizado_em: new Date().toISOString(),
        pin_hash,
        data_nascimento: data_nasc,
        nivel,
        pontos,
        cashback,
        tickets,
        total_gasto,
        qtd_pedidos,
        primeira_compra: null,
        ultima_compra: null,
        email
      })
      .select()
      .single();

    if (error) {
      logError('/api/admin/clientes/create', error as Error, { requestId });
      return handleApiError(error, '/api/admin/clientes/create', requestId);
    }

    return successResponse({
      message: 'Cliente criado com sucesso.',
      cliente: data,
    });
  } catch (error) {
    logError('/api/admin/clientes/create', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/clientes/create', requestId);
  }
}