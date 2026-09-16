import { NextResponse } from 'next/server';

/**
 * The first waiter flow used predictable four-digit passwords and local logs.
 * It is intentionally unavailable while the QR V2 operation is prepared.
 */
export function garconsLegadoPausadoResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: 'operacao_garcons_legado_pausada',
      error:
        'O antigo controle por senha de garçom foi desativado. Use Acessos, Roleta V2 e Auditoria no painel administrativo.',
    },
    { status: 410 }
  );
}
