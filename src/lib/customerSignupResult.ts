// Public response mapper: never pass through SQL error messages or personal data.
export function signupResultResponse(value: unknown):
  | { ok: true; criado: boolean; bonus: number }
  | { ok: false; message: string; code: 'unauthorized' | 'validation_error' | 'server_error'; status: number } {
  const result = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  if (result.ok === true && typeof result.criado === 'boolean' &&
    typeof result.bonus === 'number' && Number.isInteger(result.bonus) && result.bonus >= 0 && result.bonus <= 10000) {
    return { ok: true, criado: result.criado, bonus: result.bonus };
  }
  if (result.motivo === 'otp_required') return {
    ok: false, message: 'Confirme o código enviado ao seu WhatsApp antes de cadastrar.', code: 'unauthorized', status: 403,
  };
  if (result.motivo === 'existing_account') return {
    ok: false, message: 'Este telefone já tem cadastro completo. Entre com seu PIN.', code: 'validation_error', status: 409,
  };
  if (result.motivo === 'email_conflict' || result.motivo === 'conflict') return {
    ok: false, message: 'Não foi possível cadastrar com estes dados. Confira o email ou entre na conta existente.', code: 'validation_error', status: 409,
  };
  if (result.motivo === 'invalid') return {
    ok: false, message: 'Confira os dados informados para o cadastro.', code: 'validation_error', status: 400,
  };
  return { ok: false, message: 'Cadastro temporariamente indisponível. Tente novamente mais tarde.', code: 'server_error', status: 503 };
}
