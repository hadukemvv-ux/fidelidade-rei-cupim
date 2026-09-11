import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Bloqueio deliberado da roleta V1.
 *
 * A implementação anterior aceitava uma senha curta de garçom e gravava dados
 * pessoais em um fluxo que não corresponde às regras V2. A V2 só poderá
 * substituir este bloqueio quando QR temporário, sessão de uso único,
 * consentimento opcional e cupom auditável estiverem prontos no servidor.
 */
export async function POST() {
  return NextResponse.json(
    { error: "A roleta está temporariamente em preparação." },
    { status: 503 }
  );
}
