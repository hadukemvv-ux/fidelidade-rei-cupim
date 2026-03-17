import { NextRequest } from 'next/server';
import { validateAdminAuth } from '@/app/api/_utils/validateAdminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { successResponse, getRequestId, logInfo, logError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

type GarcomRow = {
  id: number;
  nome: string;
  codigo_prefixo: string | null;
  total_giros: number | null;
  ativo: boolean | null;
};

type GarcomLogRow = {
  id: number;
  garcom_id: number;
  premio: string | null;
  telefone_cliente: string | null;
  ip: string | null;
  user_agent: string | null;
  score: number | null;
  suspeito: boolean | null;
  motivo: string | null;
  criado_em: string;
};

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const authError = validateAdminAuth(request, new URL(request.url));
  if (authError) return authError;

  try {
    logInfo('/api/admin/garcons/analytics', 'Calculando analytics de garcons', { requestId });

    // 1. Busca todos os garçons ativos
    const { data: garcons, error: e1 } = await supabaseAdmin
      .from('garcons')
      .select('id, nome, codigo_prefixo, total_giros, ativo')
      .eq('ativo', true);

    if (e1) {
      logError('/api/admin/garcons/analytics', e1 as Error, { requestId });
      return handleApiError(e1, '/api/admin/garcons/analytics', requestId);
    }

    const garconsData = (garcons || []) as unknown as GarcomRow[];

    if (garconsData.length === 0) {
      return successResponse({
        analytics: [],
        resumo: {
          total_fraudes: 0,
          total_suspeitas: 0,
          garcons_com_problemas: 0,
        },
      });
    }

    const garcomIds = garconsData.map((g) => g.id);

    // 2. Busca TODOS os logs
    const { data: logs, error: e2 } = await supabaseAdmin
      .from('garcons_logs')
      .select('id, garcom_id, premio, telefone_cliente, ip, user_agent, score, suspeito, motivo, criado_em')
      .in('garcom_id', garcomIds)
      .order('criado_em', { ascending: false });

    if (e2) {
      logError('/api/admin/garcons/analytics', e2 as Error, { requestId });
      return handleApiError(e2, '/api/admin/garcons/analytics', requestId);
    }

    const logsData = (logs || []) as unknown as GarcomLogRow[];

    const logsPorGarcom = new Map<number, GarcomLogRow[]>();
    logsData.forEach((log) => {
      const lista = logsPorGarcom.get(log.garcom_id) || [];
      lista.push(log);
      logsPorGarcom.set(log.garcom_id, lista);
    });

    // 3. Agrupa alertas por garçom
    const analytics = garconsData.map((g) => {
      const logsDoGarcom = logsPorGarcom.get(g.id) || [];

      const fraudes = logsDoGarcom.filter((l) => Number(l.score || 0) >= 60);
      const suspeitos = logsDoGarcom.filter((l) => {
        const score = Number(l.score || 0);
        return score >= 30 && score < 60;
      });

      return {
        id: g.id,
        nome: g.nome,
        codigo_prefixo: g.codigo_prefixo,
        total_giros: g.total_giros,

        fraudes: fraudes.length,
        suspeitas: suspeitos.length,
        total_logs: logsDoGarcom.length,

        ultimo_evento: logsDoGarcom[0] || null,
        status:
          fraudes.length > 0
            ? 'bloqueado'
            : suspeitos.length > 0
            ? 'suspeito'
            : 'limpo',
      };
    });

    // 4. Resumo geral
    const resumo = {
      total_fraudes: analytics.reduce((acc, g) => acc + g.fraudes, 0),
      total_suspeitas: analytics.reduce((acc, g) => acc + g.suspeitas, 0),
      garcons_com_problemas: analytics.filter(
        (g) => g.fraudes > 0 || g.suspeitas > 0
      ).length,
    };

    logInfo('/api/admin/garcons/analytics', 'Analytics de garcons calculado com sucesso', {
      total_garcons: analytics.length,
      total_logs: logsData.length,
      total_fraudes: resumo.total_fraudes,
      requestId,
    });

    return successResponse({ analytics, resumo });
  } catch (error) {
    logError(
      '/api/admin/garcons/analytics',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return handleApiError(error, '/api/admin/garcons/analytics', requestId);
  }
}