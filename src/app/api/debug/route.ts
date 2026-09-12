import { NextResponse } from 'next/server';

/**
 * A antiga rota de depuração expunha registros completos de resgate para qualquer
 * sessão administrativa. Diagnósticos operacionais devem usar `/admin/auditoria`
 * e logs sem dados pessoais; esta rota não deve voltar a retornar dados reais.
 */
export async function GET() {
  return NextResponse.json({ error: 'Rota não disponível.' }, { status: 404 });
}
