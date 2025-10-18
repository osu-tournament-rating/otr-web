import { ORPCError, os } from '@orpc/server';
import { APIError } from 'better-auth/api';
import * as schema from '@otr/core/db/schema';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';

type ApiKeyActor = {
  userId: string;
  playerId: number | null;
  osuId: number | null;
  osuUsername: string | null;
};

type VerifiedApiKeyContext = {
  apiKey?: {
    id: string;
    userId: string;
    name: string | null;
    enabled: boolean;
  } | null;
  apiKeyActor?: ApiKeyActor | null;
};

const base = os.$context<
  {
    headers: Headers;
  } & VerifiedApiKeyContext
>();

const formatProcedurePath = (path: readonly string[]) =>
  path.length > 0 ? path.join('.') : 'unknown';

const maskApiKey = (value: string): string => {
  if (value.length <= 5) {
    return '*****';
  }

  return `${value.slice(0, 5)}...`;
};

type OrpcErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_SUPPORTED'
  | 'NOT_ACCEPTABLE'
  | 'TIMEOUT'
  | 'CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE_CONTENT'
  | 'TOO_MANY_REQUESTS'
  | 'CLIENT_CLOSED_REQUEST'
  | 'INTERNAL_SERVER_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT';

const STATUS_TO_ORPC_CODE = new Map<number, OrpcErrorCode>([
  [400, 'BAD_REQUEST'],
  [401, 'UNAUTHORIZED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [405, 'METHOD_NOT_SUPPORTED'],
  [406, 'NOT_ACCEPTABLE'],
  [408, 'TIMEOUT'],
  [409, 'CONFLICT'],
  [412, 'PRECONDITION_FAILED'],
  [413, 'PAYLOAD_TOO_LARGE'],
  [415, 'UNSUPPORTED_MEDIA_TYPE'],
  [422, 'UNPROCESSABLE_CONTENT'],
  [429, 'TOO_MANY_REQUESTS'],
  [499, 'CLIENT_CLOSED_REQUEST'],
  [500, 'INTERNAL_SERVER_ERROR'],
  [501, 'NOT_IMPLEMENTED'],
  [502, 'BAD_GATEWAY'],
  [503, 'SERVICE_UNAVAILABLE'],
  [504, 'GATEWAY_TIMEOUT'],
] as const);

const resolveOrpcCodeForStatus = (status: number): OrpcErrorCode => {
  const candidate = STATUS_TO_ORPC_CODE.get(status);
  if (candidate) {
    return candidate;
  }

  if (status >= 500) {
    return 'INTERNAL_SERVER_ERROR';
  }

  if (status >= 400) {
    return 'BAD_REQUEST';
  }

  return 'INTERNAL_SERVER_ERROR';
};

const toOrpcErrorFromBetterAuth = (error: APIError): ORPCError<string, unknown> => {
  const status = Number.isInteger(error.status) ? Number(error.status) : 500;
  const code = resolveOrpcCodeForStatus(status);

  return new ORPCError(code, {
    status,
    message: error.message,
    cause: error,
  });
};

const DEFAULT_SUCCESS_STATUS = 200;

const RATE_LIMIT_ERROR_CODES = new Set(['RATE_LIMITED', 'USAGE_EXCEEDED']);

const extractApiKeyVerificationError = (verification: unknown) => {
  if (!verification || typeof verification !== 'object') {
    return {
      code: null,
      message: null,
      details: undefined as unknown,
    };
  }

  const error = (verification as { error?: unknown }).error;
  if (!error || typeof error !== 'object') {
    return {
      code: null,
      message: null,
      details: undefined as unknown,
    };
  }

  const { code, message, details } = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  return {
    code: typeof code === 'string' ? code : null,
    message: typeof message === 'string' ? message : null,
    details,
  };
};

const createVerificationErrorData = (
  code: string | null,
  details: unknown
): Record<string, unknown> | undefined => {
  const base = code ? { code } : {};

  if (details && typeof details === 'object' && !Array.isArray(details)) {
    return {
      ...base,
      ...(details as Record<string, unknown>),
    };
  }

  if (details !== undefined && details !== null) {
    return {
      ...base,
      details,
    };
  }

  return Object.keys(base).length > 0 ? base : undefined;
};

const handleInvalidApiKeyVerification = (verification: unknown): never => {
  const { code, message, details } = extractApiKeyVerificationError(verification);
  const data = createVerificationErrorData(code, details);

  if (code && RATE_LIMIT_ERROR_CODES.has(code)) {
    throw new ORPCError('TOO_MANY_REQUESTS', {
      status: 429,
      message: message ?? 'API key rate limit exceeded',
      data,
    });
  }

  if (code === 'KEY_DISABLED') {
    throw new ORPCError('FORBIDDEN', {
      status: 403,
      message: message ?? 'API key disabled',
      data,
    });
  }

  throw new ORPCError('UNAUTHORIZED', {
    status: 401,
    message: message ?? 'Invalid API key provided',
    data,
  });
};

type ProcedureRouteMeta = {
  ['~orpc']?: {
    route?: {
      successStatus?: number;
    };
  };
};

const resolveSuccessStatus = (procedure: ProcedureRouteMeta | undefined): number => {
  const candidate = procedure?.['~orpc']?.route?.successStatus;
  if (typeof candidate === 'number' && candidate >= 200 && candidate < 400) {
    return candidate;
  }

  return DEFAULT_SUCCESS_STATUS;
};

const resolveSuccessStatusFromResult = (
  result: unknown,
  fallbackStatus: number
): number => {
  if (typeof result === 'object' && result !== null) {
    const candidate = (result as { status?: unknown }).status;
    if (typeof candidate === 'number' && candidate >= 200 && candidate < 400) {
      return candidate;
    }
  }

  return fallbackStatus;
};

const resolveErrorStatus = (error: unknown): number => {
  if (!error) {
    return 500;
  }

  if (error instanceof ORPCError) {
    return error.status;
  }

  if (error instanceof APIError) {
    const status = Number(error.status);
    if (Number.isInteger(status)) {
      return status;
    }
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = (error as { status?: unknown }).status;
    if (typeof candidate === 'number' && candidate >= 400 && candidate < 600) {
      return candidate;
    }
  }

  return 500;
};

const normalizeOsuId = (value: unknown) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }

  return null;
};

const formatSessionActor = (session: unknown): string => {
  if (!session || typeof session !== 'object') {
    return 'anonymous';
  }

  const candidate = session as {
    user?: { osuId?: number | string | null } | null;
    dbUser?: { id?: number | null } | null;
    dbPlayer?: { osuId?: number | string | bigint | null } | null;
  };

  const parts: string[] = [];

  if (candidate.dbUser?.id != null) {
    parts.push(`user:${candidate.dbUser.id}`);
  }

  const osuId =
    normalizeOsuId(candidate.user?.osuId) ??
    normalizeOsuId(candidate.dbPlayer?.osuId);

  if (osuId) {
    parts.push(`osu:${osuId}`);
  }

  return parts.length > 0 ? parts.join(' ') : 'anonymous';
};

type LoggingContext = {
  headers?: Headers;
  session?: unknown;
  apiKey?: VerifiedApiKeyContext['apiKey'];
  apiKeyActor?: VerifiedApiKeyContext['apiKeyActor'];
};

type LogInvocationArgs = {
  path: readonly string[];
  context: LoggingContext;
  durationMs: number;
  statusCode: number;
  error?: unknown;
};

const resolveSessionForLogging = async (
  context: LoggingContext,
  existingSession: unknown
) => {
  if (existingSession) {
    return existingSession;
  }

  if (context.apiKey || context.apiKeyActor) {
    return undefined;
  }

  if (!context.headers) {
    return undefined;
  }

  try {
    return await auth.api.getSession({ headers: context.headers });
  } catch {
    return undefined;
  }
};

const describeError = (error: unknown) => {
  if (!error) {
    return 'unknown';
  }

  if (error instanceof ORPCError) {
    return error.code ?? error.message ?? 'orpc-error';
  }

  if (error instanceof Error) {
    return error.name || error.message || 'error';
  }

  try {
    return String(error);
  } catch {
    return 'non-stringable-error';
  }
};

const logInvocation = async ({
  path,
  context,
  durationMs,
  statusCode,
  error,
}: LogInvocationArgs) => {
  try {
    const session = await resolveSessionForLogging(context, context.session);
    const timestamp = new Date().toISOString();

    const parts = [`procedure=${formatProcedurePath(path)}`];

    let userDescriptor = formatSessionActor(session);
    let playerDescriptor: string | null = null;

    const apiKeyActor = context.apiKeyActor;

    if (apiKeyActor) {
      if (apiKeyActor.osuUsername) {
        userDescriptor = apiKeyActor.osuUsername;
      } else if (apiKeyActor.playerId != null) {
        userDescriptor = `player:${apiKeyActor.playerId}`;
      } else if (apiKeyActor.osuId != null) {
        userDescriptor = `osu:${apiKeyActor.osuId}`;
      } else if (context.apiKey?.userId) {
        userDescriptor = `auth:${context.apiKey.userId}`;
      }

      if (apiKeyActor.playerId != null) {
        playerDescriptor = String(apiKeyActor.playerId);
      }
    }

    parts.push(`user=${JSON.stringify(userDescriptor)}`);

    parts.push(`playerId=${playerDescriptor ?? 'null'}`);
    parts.push(`code=${statusCode}`);

    const roundedDuration = Math.max(0, Math.round(durationMs));
    parts.push(`duration=${roundedDuration}ms`);

    if (error) {
      parts.push(`status=error`);
      parts.push(`error=${describeError(error)}`);
      console.error(`${timestamp} [oRPC]: ${parts.join(' ')}`);
      return;
    }

    parts.push(`status=ok`);
    console.info(`${timestamp} [oRPC]: ${parts.join(' ')}`);
  } catch (loggingError) {
    const timestamp = new Date().toISOString();
    console.error(
      `${timestamp} [oRPC]: logging-failed error=${describeError(loggingError)}`
    );
  }
};

const extractApiKey = (headers?: Headers) => {
  if (!headers) {
    return null;
  }

  const authorization = headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
};

const withOptionalApiKey = base.middleware(async ({ context, next }) => {
  const candidate = extractApiKey(context.headers);

  if (!candidate) {
    return next({
      context: {
        ...context,
        apiKey: null,
        apiKeyActor: null,
      } as typeof context & VerifiedApiKeyContext,
    });
  }

  try {
    const verification = await auth.api.verifyApiKey({
      headers: context.headers,
      body: {
        key: candidate,
      },
    });

    const verifiedKey = verification?.key ?? null;

    if (!verification?.valid || !verifiedKey) {
      handleInvalidApiKeyVerification(verification);
    }

    const activeKey = verifiedKey as NonNullable<typeof verifiedKey>;

    if (activeKey.enabled === false) {
      throw new ORPCError('FORBIDDEN', {
        status: 403,
        message: 'API key disabled',
        data: { code: 'KEY_DISABLED' },
      });
    }

    const { id, userId, name, enabled } = activeKey;
    let apiKeyActor: ApiKeyActor | null = null;

    try {
      const authUser = await db.query.auth_users.findFirst({
        columns: {
          id: true,
          name: true,
          playerId: true,
        },
        where: eq(schema.auth_users.id, userId),
        with: {
          player: {
            columns: {
              id: true,
              osuId: true,
              username: true,
            },
          },
        },
      });

      if (authUser) {
        const playerId = authUser.player?.id ?? authUser.playerId ?? null;

        apiKeyActor = {
          userId,
          playerId,
          osuId: authUser.player?.osuId ?? null,
          osuUsername:
            authUser.player?.username ?? (authUser.name ? authUser.name : null),
        };
      }
    } catch (apiKeyActorError) {
      const timestamp = new Date().toISOString();
      console.error(
        `${timestamp} [oRPC]: api-key-owner-lookup-failed apiKey=${maskApiKey(
          id
        )} error=${describeError(apiKeyActorError)}`
      );
    }

    return next({
      context: {
        ...context,
        apiKey: {
          id,
          userId,
          name: name ?? null,
          enabled,
        },
        apiKeyActor,
      } as typeof context & VerifiedApiKeyContext,
    });
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }

    if (error instanceof APIError) {
      throw toOrpcErrorFromBetterAuth(error);
    }

    throw new ORPCError('UNAUTHORIZED', {
      status: 401,
      message: 'Invalid API key provided',
      cause: error instanceof Error ? error : undefined,
    });
  }
});

const withDatabase = base.middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      db,
    },
  });
});

const withAuth = base.middleware(async ({ context, next }) => {
  try {
    const session = await auth.api.getSession({ headers: context.headers });

    if (!session) {
      throw new ORPCError('UNAUTHORIZED', {
        status: 401,
        message: 'Invalid or expired session',
      });
    }

    return next({
      context: {
        ...context,
        session,
      },
    });
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }

    if (error instanceof APIError) {
      throw toOrpcErrorFromBetterAuth(error);
    }

    throw error;
  }
});

const withRequestLogging = base.middleware(
  async ({ context, path, next, procedure }) => {
    const start = Date.now();
    const successStatus = resolveSuccessStatus(procedure);

    try {
      const result = await next();

      await logInvocation({
        path,
        context,
        durationMs: Date.now() - start,
        statusCode: resolveSuccessStatusFromResult(result, successStatus),
      });

      return result;
    } catch (error) {
      await logInvocation({
        path,
        context,
        durationMs: Date.now() - start,
        statusCode: resolveErrorStatus(error),
        error,
      });

      throw error;
    }
  }
);

export const publicProcedure = base
  .use(withDatabase)
  .use(withOptionalApiKey)
  .use(withRequestLogging);
export const protectedProcedure = base
  .use(withDatabase)
  .use(withAuth)
  .use(withRequestLogging);
