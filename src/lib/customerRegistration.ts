import { isLegacyAutomaticPin } from './pin.ts';

export type CustomerRegistrationRecord = {
  nome?: string | null;
  telefone?: string | null;
  pin_hash?: string | null;
};

/** Email e data de nascimento são opcionais; a posse do WhatsApp e o PIN protegem a conta. */
export function isPreCadastro(cliente: CustomerRegistrationRecord | null | undefined) {
  if (!cliente) return false;

  const nome = cliente.nome || '';
  const telefone = cliente.telefone || '';

  return (
    nome === 'Cliente Novo (Roleta)' ||
    !cliente.pin_hash ||
    isLegacyAutomaticPin(telefone, cliente.pin_hash)
  );
}
