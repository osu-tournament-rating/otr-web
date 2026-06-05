import { ORPCError } from '@orpc/server';

import { hasAdminScope } from '@/lib/auth/roles';

export const ADMIN_DATA_MUTATION_FREEZE_MESSAGE =
  'Admin edits to tournament, match, game, and score data are disabled every Tuesday from 11:45 to 12:15 UTC while backups and processing run.';

export const ADMIN_DATA_MUTATION_FREEZE_WINDOW = {
  utcDay: 2,
  startMinuteOfDay: 11 * 60 + 45,
  endMinuteOfDay: 12 * 60 + 15,
} as const;

export type AdminDataMutationClockContext = {
  adminDataMutationDate?: Date | null;
};

type SessionWithDbUser = {
  dbUser?: {
    id: number;
    scopes?: string[] | null;
  } | null;
};

const hasAdminDataMutationDate = (
  value: unknown
): value is AdminDataMutationClockContext =>
  typeof value === 'object' &&
  value !== null &&
  'adminDataMutationDate' in value;

const resolveAdminDataMutationDate = (value?: unknown) => {
  if (value instanceof Date) {
    return value;
  }

  if (hasAdminDataMutationDate(value)) {
    return value.adminDataMutationDate ?? new Date();
  }

  return new Date();
};

export const isAdminDataMutationFreezeWindow = (value?: unknown) => {
  const date = resolveAdminDataMutationDate(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (date.getUTCDay() !== ADMIN_DATA_MUTATION_FREEZE_WINDOW.utcDay) {
    return false;
  }

  const minuteOfDay = date.getUTCHours() * 60 + date.getUTCMinutes();

  return (
    minuteOfDay >= ADMIN_DATA_MUTATION_FREEZE_WINDOW.startMinuteOfDay &&
    minuteOfDay < ADMIN_DATA_MUTATION_FREEZE_WINDOW.endMinuteOfDay
  );
};

export const ensureAdminDataMutationAllowed = (value?: unknown) => {
  if (!isAdminDataMutationFreezeWindow(value)) {
    return;
  }

  throw new ORPCError('SERVICE_UNAVAILABLE', {
    status: 503,
    message: ADMIN_DATA_MUTATION_FREEZE_MESSAGE,
    data: {
      window: 'Tuesdays 11:45-12:15 UTC',
    },
  });
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
