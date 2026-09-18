import type { OperationalRole } from '@/lib/operationalAuth';

export function destinoInicialOperacional(papel: OperationalRole) {
  if (papel === 'garcom') return '/garcom/comanda';
  if (papel === 'caixa') return '/caixa';
  return '/admin';
}

export function podeAbrirAdmin(papel: OperationalRole) {
  return papel === 'gestor' || papel === 'superadmin';
}

export function podeAlterarAdministracao(papel: OperationalRole) {
  return papel === 'superadmin';
}
