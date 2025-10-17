import { ORPCError, os } from '@orpc/server';
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
  error?: unknown;
  args?: string;
};

const resolveSessionForLogging = async (
  context: LoggingContext,
  existingSession: unknown
) => {
  if (existingSession) {
    return existingSession;
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

const SENSITIVE_KEYS = new Set([
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'password',
  'secret',
]);

const redactSensitive = (key: string, value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return '[redacted]';
  }

  return value;
};

const formatArgs = (input: unknown): string | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === 'bigint') {
    return input.toString();
  }

  if (
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return String(input);
  }

  if (typeof input === 'function') {
    return '[function]';
  }

  if (typeof input === 'object' && input) {
    if (
      typeof (input as { [Symbol.asyncIterator]?: unknown })[
        Symbol.asyncIterator
      ] === 'function'
    ) {
      return '[async-iterator]';
    }

    if (
      typeof ReadableStream !== 'undefined' &&
      input instanceof ReadableStream
    ) {
      return '[stream]';
    }
  }

  const seen = new WeakSet<object>();

  const replacer = (key: string, value: unknown) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) {
        return '[Circular]';
      }

      seen.add(value as object);
    }

    if (typeof value === 'string') {
      return redactSensitive(key, value);
    }

    return value;
  };

  try {
    const serialized = JSON.stringify(input, replacer);

    if (!serialized || serialized === '{}' || serialized === '[]') {
      return undefined;
    }

    const maxLength = 2000;
    return serialized.length > maxLength
      ? `${serialized.slice(0, maxLength - 3)}...`
      : serialized;
  } catch (serializationError) {
    const timestamp = new Date().toISOString();
    console.error(
      `${timestamp} [oRPC]: argument-serialization-failed`,
      serializationError
    );
    return '[unserializable]';
  }
};

const logInvocation = async ({
  path,
  context,
  durationMs,
  error,
  args,
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

    if (playerDescriptor) {
      parts.push(`playerId=${playerDescriptor}`);
    }

    if (context.apiKey?.id) {
      parts.push(`apiKey=${maskApiKey(context.apiKey.id)}`);
    }

    if (args) {
      parts.push(`args=${args}`);
    }

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

    if (!verification?.valid || !verification.key?.enabled) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Invalid API key provided',
      });
    }

    const { id, userId, name, enabled } = verification.key;
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
    throw new ORPCError('UNAUTHORIZED', {
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
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid or expired session',
    });
  }

  return next({
    context: {
      ...context,
      session,
    },
  });
});

const withRequestLogging = base.middleware(
  async ({ context, path, next }, input) => {
    const start = Date.now();
    const args = formatArgs(input);

    try {
      const result = await next();

      await logInvocation({
        path,
        context,
        durationMs: Date.now() - start,
        args,
      });

      return result;
    } catch (error) {
      await logInvocation({
        path,
        context,
        durationMs: Date.now() - start,
        error,
        args,
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
