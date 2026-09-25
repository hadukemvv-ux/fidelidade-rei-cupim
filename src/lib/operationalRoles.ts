export type OperationalRole = "superadmin" | "gestor" | "caixa" | "garcom";

const roleRank: Record<OperationalRole, number> = {
  garcom: 0,
  caixa: 1,
  gestor: 2,
  superadmin: 3,
};

export function isOperationalRole(value: unknown): value is OperationalRole {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(roleRank, value);
}

export function canAccessOperationalRoute(
  role: unknown,
  minimumRole: OperationalRole,
  allowedRoles?: readonly OperationalRole[],
): role is OperationalRole {
  return isOperationalRole(role)
    && roleRank[role] >= roleRank[minimumRole]
    && (!allowedRoles || allowedRoles.includes(role));
}
