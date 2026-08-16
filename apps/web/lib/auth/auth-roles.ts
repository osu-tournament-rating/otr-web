import { createAccessControl } from 'better-auth/plugins/access';

import { APP_ROLES } from './roles';

export { ADMIN_ROLES } from './roles';

export const statements = {
  user: ['create', 'read', 'update', 'delete', 'ban', 'unban', 'impersonate'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
} as const;

export const ac = createAccessControl(statements);

export const admin = ac.newRole({
  user: ['read', 'update', 'ban', 'unban'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
});

export const superadmin = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'ban', 'unban', 'impersonate'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
});

export const ROLES = APP_ROLES;

export type Role = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ALL_ROLES = Object.values(APP_ROLES);
