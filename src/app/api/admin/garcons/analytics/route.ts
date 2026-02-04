import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Busca todos os garçons ativos
    const { data: garcons, error: e1 } = await supabaseAdmin
      .from("garcons")
      .select("id, nome, codigo_prefixo, total_giros, ativo")
      .eq("ativo", true);

    if (e1) throw e1;

    // 2. Busca TODOS os logs
    const { data: logs, error: e2 } = await supabaseAdmin
      .from("garcons_logs")
      .select("*")
      .order("criado_em", { ascending: false });

    if (e2) throw e2;

    // 3. Agrupa alertas por garçom
    const analytics = garcons.map((g) => {
      // CORREÇÃO CRÍTICA: usar o campo CORRETO = garcon_id
      const logsDoGarcom = logs.filter((l) => l.garcom_id == g.id);

      const fraudes = logsDoGarcom.filter((l) => l.score >= 60);
      const suspeitos = logsDoGarcom.filter(
        (l) => l.score >= 30 && l.score < 60
      );

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
            ? "bloqueado"
            : suspeitos.length > 0
            ? "suspeito"
            : "limpo",
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

    return NextResponse.json({ analytics, resumo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}