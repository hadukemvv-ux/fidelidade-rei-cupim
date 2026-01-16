import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ==============================================
// CONFIGURAÇÃO
// ==============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Token de segurança para o cron (evita que qualquer um execute)
const CRON_SECRET = process.env.CRON_SECRET || process.env.SAIPOS_SECRET || null;

// ==============================================
// REGRAS DE EXPIRAÇÃO POR NÍVEL
// ==============================================
const REGRAS_EXPIRACAO: Record<string, { dias50: number; dias100: number }> = {
  Bronze: { dias50: 15, dias100: 30 },
  Prata: { dias50: 20, dias100: 45 },
  Ouro: { dias50: 30, dias100: 60 },
};

// Calcula o nível baseado nos pontos
function calcularNivel(totalPontos: number): string {
  if (totalPontos >= 5001) return 'Ouro';
  if (totalPontos >= 2001) return 'Prata';
  return 'Bronze';
}

// Calcula dias desde a última compra
function diasSemCompra(ultimaCompra: string | null): number {
  if (!ultimaCompra) return 9999; // Nunca comprou = muito tempo
  const ultima = new Date(ultimaCompra);
  const agora = new Date();
  const diffMs = agora.getTime() - ultima.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ==============================================
// HANDLER DO CRON
// ==============================================
export async function GET(request: NextRequest) {
  // 1️⃣ Verifica token de segurança
  const token = request.headers.get('authorization')?.replace('Bearer ', '') 
             || request.nextUrl.searchParams.get('token');
  
  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resultados: any[] = [];
  const erros: any[] = [];

  try {
    // 2️⃣ Buscar todos os clientes
    const { data: clientes, error: errClientes } = await supabase
      .from('clientes')
      .select('telefone, ultima_compra');

    if (errClientes) {
      return NextResponse.json({ error: errClientes.message }, { status: 500 });
    }

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ message: 'Nenhum cliente encontrado', processados: 0 });
    }

    // 3️⃣ Processar cada cliente
    for (const cliente of clientes) {
      const { telefone, ultima_compra } = cliente;

      try {
        // Buscar dados atuais
        const [resPontos, resCashback, resTickets] = await Promise.all([
          supabase.from('pontos').select('nivel, total').eq('telefone', telefone).maybeSingle(),
          supabase.from('cashback').select('saldo').eq('telefone', telefone).maybeSingle(),
          supabase.from('tickets').select('quantidade').eq('telefone', telefone).maybeSingle(),
        ]);

        const pontosAtuais = resPontos.data?.total ?? 0;
        const cashbackAtual = resCashback.data?.saldo ?? 0;
        const ticketsAtuais = resTickets.data?.quantidade ?? 0;
        const nivelAtual = resPontos.data?.nivel ?? 'Bronze';

        // Se não tem nada, pula
        if (pontosAtuais === 0 && cashbackAtual === 0 && ticketsAtuais === 0) {
          continue;
        }

        // Calcular dias sem compra
        const dias = diasSemCompra(ultima_compra);
        const regra = REGRAS_EXPIRACAO[nivelAtual] || REGRAS_EXPIRACAO['Bronze'];

        let percentualReducao = 0;
        let motivo = '';

        // Verificar qual regra aplicar
        if (dias >= regra.dias100) {
          percentualReducao = 100;
          motivo = `${dias} dias sem compra (>= ${regra.dias100} dias = perde 100%)`;
        } else if (dias >= regra.dias50) {
          percentualReducao = 50;
          motivo = `${dias} dias sem compra (>= ${regra.dias50} dias = perde 50%)`;
        }

        // Se não precisa reduzir, pula
        if (percentualReducao === 0) {
          continue;
        }

        // Calcular novos valores
        const fator = percentualReducao === 100 ? 0 : 0.5;
        const novosPontos = Math.floor(pontosAtuais * fator);
        const novoCashback = parseFloat((cashbackAtual * fator).toFixed(2));
        const novosTickets = Math.floor(ticketsAtuais * fator);
        const novoNivel = calcularNivel(novosPontos);

        // Atualizar no banco
        await Promise.all([
          supabase.from('pontos').upsert({
            telefone,
            total: novosPontos,
            nivel: novoNivel,
            atualizado_em: new Date().toISOString(),
          }),
          supabase.from('cashback').upsert({
            telefone,
            saldo: novoCashback,
            atualizado_em: new Date().toISOString(),
          }),
          supabase.from('tickets').upsert({
            telefone,
            quantidade: novosTickets,
            atualizado_em: new Date().toISOString(),
          }),
        ]);

        resultados.push({
          telefone,
          diasSemCompra: dias,
          motivo,
          nivelAnterior: nivelAtual,
          nivelNovo: novoNivel,
          rebaixou: novoNivel !== nivelAtual,
          antes: {
            pontos: pontosAtuais,
            cashback: cashbackAtual,
            tickets: ticketsAtuais,
          },
          depois: {
            pontos: novosPontos,
            cashback: novoCashback,
            tickets: novosTickets,
          },
        });

      } catch (err: any) {
        erros.push({ telefone, erro: err.message });
      }
    }

    // 4️⃣ Resposta final
    return NextResponse.json({
      message: 'Expiração processada',
      dataExecucao: new Date().toISOString(),
      totalClientes: clientes.length,
      clientesAfetados: resultados.length,
      resultados,
      erros: erros.length > 0 ? erros : undefined,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
