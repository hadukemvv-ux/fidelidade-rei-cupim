/** Drafts only: nothing imports this catalog into a live trigger or sender yet. */
const whatsappMessageCatalog = Object.freeze({
  verificar_telefone: {
    audience: 'cliente', purpose: 'verificacao', automaticEnabled: false,
    candidateEvent: 'Código solicitado pela pessoa',
    requirements: ['Pedido explícito de código', 'Reserva OTP válida e não expirada', 'Limites antiabuso'],
    draft: 'Clube Cupim: seu código de verificação é {codigo}. Válido por 10 minutos. Não compartilhe.',
  },
  concluir_cadastro: {
    audience: 'cliente', purpose: 'servico', automaticEnabled: false,
    candidateEvent: 'Benefício futuro reservado com cadastro incompleto',
    requirements: ['Telefone comprovado', 'Benefício futuro reservado', 'Cadastro ainda incompleto', 'Um aviso por reserva'],
    draft: 'Seu benefício do Clube Cupim está reservado. Complete seu cadastro: https://www.clubecupim.com.br/cadastro/completar',
  },
  escolher_item_premio: {
    audience: 'garcom', purpose: 'operacional', automaticEnabled: false,
    candidateEvent: 'Pendência real de entrega criada',
    requirements: ['Operador ativo e responsável pela pendência', 'Telefone do operador comprovado', 'Prêmio e opções definidos pelo servidor'],
    draft: 'Clube Cupim: há um prêmio aguardando entrega. Escolha o item em https://www.clubecupim.com.br/admin/baixas e confirme somente depois de entregar.',
  },
});

// A connection alone is not phone verification, eligibility, delivery or consent.
// Event timings, final wording, persistent outbox and live triggers need approval.
export function messageCatalogSummary() {
  return Object.entries(whatsappMessageCatalog).map(([id, model]) => ({
    id, audience: model.audience, purpose: model.purpose,
    automaticEnabled: model.automaticEnabled, candidateEvent: model.candidateEvent,
    requirements: [...model.requirements], draft: model.draft,
  }));
}
