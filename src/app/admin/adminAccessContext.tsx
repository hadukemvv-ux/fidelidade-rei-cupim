'use client';

import { createContext, useContext } from 'react';
import type { OperationalRole } from '@/lib/operationalAuth';
import { podeAlterarAdministracao } from '@/lib/operationalAccess';

export const AdminAccessContext = createContext<OperationalRole>('superadmin');

export function useAdminCanChange() {
  return podeAlterarAdministracao(useContext(AdminAccessContext));
}
