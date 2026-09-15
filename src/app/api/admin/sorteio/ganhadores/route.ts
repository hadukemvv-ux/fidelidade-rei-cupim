import { NextRequest } from 'next/server';
import { sorteioLegadoPausadoResponse } from '@/lib/legacySorteio';

/**
 * Histórico do antigo mecanismo de sorteios.
 *
 * Pausado enquanto a operação não possui a autorização, o regulamento e a
 * política de retenção necessários. A rota permanece apenas para não gerar
 * respostas ambíguas para versões antigas do painel.
 */
export async function GET(_request: NextRequest) {
  return sorteioLegadoPausadoResponse();
}
