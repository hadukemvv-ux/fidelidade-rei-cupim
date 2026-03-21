import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export const dynamic = "force-dynamic";

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const niveis = ["BRONZE", "PRATA", "OURO", "REI"];

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = await validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/seed-financeiro', 'Gerando seed financeiro de clientes de teste', {
      requestId,
    });

    const clientes = [];
    const timestamp = Date.now(); // garante unicidade

    for (let i = 1; i <= 15; i++) {
      const total = random(50, 600);

      clientes.push({
        nome: `Cliente Teste ${i} - ${timestamp}`, // NOME 100% único
        telefone: `8599${random(1000000, 9999999)}`,
        cpf: `${random(100,999)}.${random(100,999)}.${random(100,999)}-00`,
        email: `cliente${i}_${timestamp}@teste.com`, // único também
        atualizado_em: new Date().toISOString(),
        pin_hash: "",
        data_nascimento: "1990-01-01",
        nivel: niveis[random(0, 3)],
        pontos: random(0, 3000),
        cashback: random(0, 80),
        tickets: random(0, 20),
        total_gasto: total,
        qtd_pedidos: random(1, 8),
        primeira_compra: new Date(Date.now() - random(5, 60) * 86400000).toISOString(),
        ultima_compra: new Date(Date.now() - random(0, 5) * 86400000).toISOString()
      });
    }

    const { error } = await supabaseAdmin
      .from("base_clientes_saipos")
      .insert(clientes);

    if (error) {
      logError('/api/admin/seed-financeiro', error as Error, { requestId });
      return handleApiError(error, '/api/admin/seed-financeiro', requestId);
    }

    return successResponse({
      sucesso: true,
      inseridos: clientes.length,
      aviso: "Clientes de TESTE criados sem colisão de nomes!"
    });

  } catch (error) {
    logError('/api/admin/seed-financeiro', error instanceof Error ? error : new Error(String(error)), {
      requestId,
    });
    return handleApiError(error, '/api/admin/seed-financeiro', requestId);
  }
}