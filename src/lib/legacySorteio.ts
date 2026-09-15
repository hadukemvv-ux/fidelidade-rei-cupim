import { NextResponse } from "next/server";

/**
 * O antigo fluxo de sorteio usa tickets e dados pessoais, mas não possui o
 * modelo jurídico e transacional exigido para uma campanha real. Centralizar
 * esta resposta impede que uma tela esquecida volte a publicar ou alterar
 * dados enquanto a frente V2 não for formalmente projetada.
 */
export function sorteioLegadoPausadoResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: "sorteio_legado_pausado",
      error: "Sorteios estão pausados. O Clube continua operando somente com pontos e benefícios definidos.",
    },
    { status: 410 },
  );
}
