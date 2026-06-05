import { ORPCError } from '@orpc/server';
import {
  MAINTENANCE_WINDOW_END_UTC_MINUTES,
  MAINTENANCE_WINDOW_START_UTC_MINUTES,
  MAINTENANCE_WINDOW_UTC_DAY,
  isWithinMaintenanceWindow,
} from '@otr/core/maintenance';

import { hasAdminScope } from '@/lib/auth/roles';

export const ADMIN_DATA_MUTATION_FREEZE_MESSAGE =
  'Admin edits to tournament, match, game, and score data are disabled every Tuesday from 11:45 to 12:15 UTC while backups and processing run.';

export const ADMIN_DATA_MUTATION_FREEZE_WINDOW = {
  utcDay: MAINTENANCE_WINDOW_UTC_DAY,
  startMinuteOfDay: MAINTENANCE_WINDOW_START_UTC_MINUTES,
  endMinuteOfDay: MAINTENANCE_WINDOW_END_UTC_MINUTES,
} as const;

type HeadersLike = Pick<Headers, 'get'>;

export type AdminDataMutationClockContext = {
  adminDataMutationDate?: Date | null;
  headers?: HeadersLike | null;
};

const E2E_OVERRIDE_HEADER = 'x-e2e-maintenance-window';

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

const hasHeaders = (
  value: unknown
): value is { headers?: HeadersLike | null } =>
  typeof value === 'object' && value !== null && 'headers' in value;

const resolveAdminDataMutationDate = (value?: unknown) => {
  if (value instanceof Date) {
    return value;
  }

  if (hasAdminDataMutationDate(value)) {
    return value.adminDataMutationDate ?? new Date();
  }

  return new Date();
};

const resolveE2eMaintenanceOverride = (value?: unknown): boolean | null => {
  if (process.env.E2E_TEST_AUTH !== 'true') {
    return null;
  }

  if (!hasHeaders(value) || !value.headers) {
    return null;
  }

  const override = value.headers.get(E2E_OVERRIDE_HEADER);

  if (override === 'active') {
    return true;
  }

  if (override === 'inactive') {
    return false;
  }

  return null;
};

export const isAdminDataMutationFreezeWindow = (value?: unknown) => {
  const override = resolveE2eMaintenanceOverride(value);

  if (override !== null) {
    return override;
  }

  if (process.env.MAINTENANCE_WINDOW_ENABLED === 'false') {
    return false;
  }

  const date = resolveAdminDataMutationDate(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return isWithinMaintenanceWindow(date);
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
