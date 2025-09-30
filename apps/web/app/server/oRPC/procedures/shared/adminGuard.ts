import { ORPCError } from '@orpc/server';

import { hasAdminScope } from '@/lib/auth/roles';

type SessionWithDbUser = {
  dbUser?: {
    id: number;
    scopes?: string[] | null;
  } | null;
};

export const ensureAdminSession = (
  session: SessionWithDbUser | null | undefined
) => {
  if (!session) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'No active session',
    });
  }

  const scopes = session.dbUser?.scopes ?? [];

  if (!hasAdminScope(scopes)) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Admin privileges required',
    });
  }

  const adminUserId = session.dbUser?.id ?? null;

  if (!adminUserId) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Admin user record missing',
    });
  }

  return {
    adminUserId,
    scopes,
  };
};
