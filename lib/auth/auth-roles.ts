import { createAccessControl } from 'better-auth/plugins/access';

// Define permissions for various resources
export const statements = {
  user: ['create', 'read', 'update', 'delete', 'ban', 'unban', 'impersonate'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
} as const;

// Create access control instance
export const ac = createAccessControl(statements);

// Define the admin role with broad permissions
export const admin = ac.newRole({
  user: ['read', 'update', 'ban', 'unban'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
});

// Define the superadmin role with all permissions
export const superadmin = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'ban', 'unban', 'impersonate'],
  session: ['revoke'],
  tournament: ['create', 'read', 'update', 'delete', 'publish'],
  match: ['create', 'read', 'update', 'delete'],
  player: ['create', 'read', 'update', 'delete'],
  rating: ['calculate', 'update'],
  role: ['assign', 'revoke'],
});

// Role constants for use throughout the application
export const ROLES = {
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

// Type for roles
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Array of all available roles
export const ALL_ROLES = Object.values(ROLES);

// Admin roles that have elevated privileges
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPERADMIN];
