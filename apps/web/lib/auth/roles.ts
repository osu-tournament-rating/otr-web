export const APP_ROLES = {
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ADMIN_ROLES = [APP_ROLES.ADMIN, APP_ROLES.SUPERADMIN] as const;

export const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);

export const hasAdminScope = (scopes: readonly string[] | null | undefined) =>
  Array.isArray(scopes) && scopes.some((scope) => ADMIN_ROLE_SET.has(scope));
