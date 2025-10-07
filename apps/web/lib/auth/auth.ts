import { db } from '@/lib/db';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createFieldAttribute } from 'better-auth/db';
import {
  admin as adminPlugin,
  apiKey,
  customSession,
  genericOAuth,
} from 'better-auth/plugins';
import { ac, admin, superadmin, ADMIN_ROLES } from './auth-roles';
import { nextCookies } from 'better-auth/next-js';
import * as schema from '@otr/core/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Ruleset } from '@otr/core/osu';
import { API as OsuApi } from 'osu-api-v2-js';
import type { User } from 'osu-api-v2-js';

const OSU_PROVIDER_ID = 'osu';
const OSU_PROFILE_URL = 'https://osu.ppy.sh/api/v2/me';
// The account create hook runs before defaults are coerced, so values can be
// undefined where the Drizzle type expects null. We keep this relaxed type here
// to describe the payload Better Auth actually hands us.
type AuthAccount = {
  providerId: string | null;
  accountId: string | null;
  userId: string;
  accessToken?: string | null;
};

type AuthUserRecord = typeof schema.auth_users.$inferSelect;

type OsuProfileLike =
  | User.Extended.WithStatisticsrulesets
  | User.Relation['target'];

const parseOsuId = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeUsername = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const sanitizeCountry = (value: string | null | undefined) =>
  value ? value.trim().toUpperCase() : '';

const mapPlaymodeToRuleset = (playmode?: string | null) => {
  switch (playmode) {
    case 'osu':
      return Ruleset.Osu;
    case 'taiko':
      return Ruleset.Taiko;
    case 'fruits':
      return Ruleset.Catch;
    case 'mania':
      // TODO: Set based on variants
      return Ruleset.Mania4k;
    default:
      return Ruleset.Osu;
  }
};

const fetchOsuProfile = async (
  accessToken?: string | null
): Promise<User.Extended.WithStatisticsrulesets | null> => {
  if (!accessToken) {
    return null;
  }

  try {
    const api = new OsuApi({
      access_token: accessToken,
      token_type: 'Bearer',
    });

    return await api.getResourceOwner();
  } catch (error) {
    console.error('Failed to fetch osu! profile', error);
    return null;
  }
};

type EnsurePlayerParams = {
  osuId: number;
  profile?: OsuProfileLike | null;
};

const ensurePlayer = async ({
  osuId,
  profile,
}: EnsurePlayerParams): Promise<typeof schema.players.$inferSelect | null> => {
  const nowIso = new Date().toISOString();

  let player = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuId),
  });

  const sanitizedUsername = sanitizeUsername(profile?.username);
  const sanitizedCountry = sanitizeCountry(profile?.country_code);
  let profilePlaymode: string | null | undefined;
  if (profile && 'playmode' in profile) {
    profilePlaymode = profile.playmode;
  }
  const defaultRuleset = profile
    ? mapPlaymodeToRuleset(profilePlaymode)
    : Ruleset.Osu;

  if (profile?.is_bot) {
    // Skip persisting bot accounts
    return player ?? null;
  }

  if (!player) {
    const created = await db
      .insert(schema.players)
      .values({
        osuId,
        username: sanitizedUsername,
        country: sanitizedCountry,
        defaultRuleset,
        osuLastFetch: nowIso,
        osuTrackLastFetch: null,
      })
      .onConflictDoNothing({ target: schema.players.osuId })
      .returning();

    player =
      created[0] ??
      (await db.query.players.findFirst({
        where: eq(schema.players.osuId, osuId),
      }));
  } else if (profile) {
    const updatePayload = {
      username: sanitizedUsername || player.username,
      country: sanitizedCountry || player.country,
      defaultRuleset,
      osuLastFetch: nowIso,
    };

    await db
      .update(schema.players)
      .set(updatePayload)
      .where(eq(schema.players.id, player.id));

    player = {
      ...player,
      ...updatePayload,
    };
  }

  return player ?? null;
};

const ensurePlayerAndAppUser = async (params: EnsurePlayerParams) => {
  const player = await ensurePlayer(params);

  if (!player) {
    return null;
  }

  await db
    .insert(schema.users)
    .values({ playerId: player.id })
    .onConflictDoNothing({ target: schema.users.playerId });

  const appUser = await db.query.users.findFirst({
    where: eq(schema.users.playerId, player.id),
  });

  return {
    player,
    appUser,
  };
};

const syncPlayerFriends = async ({
  playerId,
  accessToken,
  profile,
}: {
  playerId: number;
  accessToken?: string | null;
  profile: User.Extended.WithStatisticsrulesets;
}) => {
  if (!accessToken) {
    return;
  }

  await ensurePlayer({
    osuId: profile.id,
    profile,
  });

  let relations: User.Relation[] = [];

  try {
    const api = new OsuApi({
      access_token: accessToken,
      token_type: 'Bearer',
    });

    const fetched = await api.getFriends();
    relations = Array.isArray(fetched) ? fetched : [];
  } catch (error) {
    console.error('Failed to fetch osu! friends', error);
    return;
  }

  const uniqueFriends = new Map<number, User.Relation>();

  for (const relation of relations) {
    if (!relation || relation.relation_type !== 'friend') {
      continue;
    }

    if (typeof relation.target_id !== 'number') {
      continue;
    }

    uniqueFriends.set(relation.target_id, relation);
  }

  const friendEntries: Array<{ friendId: number; mutual: boolean }> = [];

  for (const [targetId, relation] of uniqueFriends) {
    const profile = relation.target;

    if (profile?.is_bot) {
      continue;
    }

    const ensured = await ensurePlayer({
      osuId: targetId,
      profile,
    });

    if (!ensured) {
      continue;
    }

    friendEntries.push({
      friendId: ensured.id,
      mutual: !!relation.mutual,
    });
  }

  const friendIdSet = new Set(friendEntries.map((entry) => entry.friendId));

  try {
    await db.transaction(async (tx) => {
      if (friendEntries.length === 0) {
        await tx
          .delete(schema.playerFriends)
          .where(eq(schema.playerFriends.playerId, playerId));
        return;
      }

      await tx
        .insert(schema.playerFriends)
        .values(
          friendEntries.map((entry) => ({
            playerId,
            friendId: entry.friendId,
            mutual: entry.mutual,
          }))
        )
        .onConflictDoUpdate({
          target: [
            schema.playerFriends.playerId,
            schema.playerFriends.friendId,
          ],
          set: {
            mutual: sql`excluded.mutual`,
          },
        });

      const existing = await tx
        .select({ friendId: schema.playerFriends.friendId })
        .from(schema.playerFriends)
        .where(eq(schema.playerFriends.playerId, playerId));

      const stale = existing
        .map((entry) => entry.friendId)
        .filter((id) => !friendIdSet.has(id));

      if (stale.length > 0) {
        await tx
          .delete(schema.playerFriends)
          .where(
            and(
              eq(schema.playerFriends.playerId, playerId),
              inArray(schema.playerFriends.friendId, stale)
            )
          );
      }
    });
  } catch (error) {
    console.error('Failed to sync osu! friends to database', error);
  }
};

const ensureOsuAccountLink = async (
  account: AuthAccount
): Promise<number | null> => {
  if (account.providerId !== OSU_PROVIDER_ID) {
    return null;
  }

  try {
    const osuId = parseOsuId(account.accountId);
    if (osuId === null) {
      console.error('Invalid osu! account id', account.accountId);
      return null;
    }

    const authUser = await db.query.auth_users.findFirst({
      where: eq(schema.auth_users.id, account.userId),
    });

    if (!authUser) {
      return null;
    }

    const profile = await fetchOsuProfile(account.accessToken);

    const ensured = await ensurePlayerAndAppUser({
      osuId,
      profile,
    });

    if (!ensured) {
      return null;
    }

    const { player, appUser } = ensured;

    if (profile) {
      await syncPlayerFriends({
        playerId: player.id,
        accessToken: account.accessToken,
        profile,
      });
    }

    const scopes = appUser?.scopes ?? [];
    const hasAdminScope = scopes.includes('admin');

    const updatePayload: Partial<typeof schema.auth_users.$inferInsert> = {};

    if (!authUser.playerId || authUser.playerId !== player.id) {
      updatePayload.playerId = player.id;
    }

    if (
      hasAdminScope &&
      authUser.role !== 'admin' &&
      authUser.role !== 'superadmin'
    ) {
      updatePayload.role = 'admin';
    }

    if (Object.keys(updatePayload).length > 0) {
      await db
        .update(schema.auth_users)
        .set(updatePayload)
        .where(eq(schema.auth_users.id, authUser.id));
    }

    return player.id;
  } catch (error) {
    console.error('Failed to link osu! account', error);
    return null;
  }
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: {
      ...schema,
      user: schema.auth_users,
      account: schema.auth_accounts,
      verification: schema.auth_verifications,
      session: schema.auth_sessions,
      apikeys: schema.apiKeys,
    },
  }),
  session: {
    modelName: 'auth_session',
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  account: {
    modelName: 'auth_account',
    accountLinking: {
      enabled: true,
      // Allow linking accounts even when osu! doesn't return an email
      allowDifferentEmails: true,
    },
  },
  user: {
    modelName: 'auth_user',
    additionalFields: {
      playerId: createFieldAttribute('number', {
        required: true,
        input: true,
        references: {
          model: 'players',
          field: 'id',
          onDelete: 'cascade',
        },
      }),
    },
  },
  verification: {
    modelName: 'auth_verification',
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          await ensureOsuAccountLink(account);
        },
      },
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        superadmin,
      },
      adminRoles: [...ADMIN_ROLES],
      defaultRole: 'user',
    }),
    apiKey({
      rateLimit: {
        enabled: true,
        maxRequests: 60,
        timeWindow: 60 * 1000,
      },
    }),
    genericOAuth({
      config: [
        {
          providerId: OSU_PROVIDER_ID,
          clientId: process.env.WEB_OSU_CLIENT_ID,
          clientSecret: process.env.WEB_OSU_CLIENT_SECRET,
          authorizationUrl: 'https://osu.ppy.sh/oauth/authorize',
          tokenUrl: 'https://osu.ppy.sh/oauth/token',
          userInfoUrl: OSU_PROFILE_URL,
          scopes: ['identify', 'public', 'friends.read'],
          getUserInfo: async (tokens) => {
            const profile = await fetchOsuProfile(tokens.accessToken);

            if (!profile) {
              return null;
            }

            const ensured = await ensurePlayerAndAppUser({
              osuId: profile.id,
              profile,
            });

            if (!ensured) {
              return null;
            }

            await syncPlayerFriends({
              playerId: ensured.player.id,
              accessToken: tokens.accessToken,
              profile,
            });

            // osu! OAuth2 doesn't return email addresses, so we use a placeholder
            return {
              id: profile.id.toString(),
              email: `placeholder-${profile.id}`,
              name: profile.username,
              image: profile.avatar_url,
              emailVerified: false,
              playerId: ensured.player.id,
            };
          },
        },
      ],
    }),
    customSession(async ({ user, session }) => {
      const account = await db.query.auth_accounts.findFirst({
        where: and(
          eq(schema.auth_accounts.userId, user.id),
          eq(schema.auth_accounts.providerId, OSU_PROVIDER_ID)
        ),
      });

      const baseAuthUser = user as AuthUserRecord & typeof user;
      let authUser = baseAuthUser;
      let playerId: number | null = authUser.playerId ?? null;

      if (!playerId && account) {
        playerId = await ensureOsuAccountLink(account);
        if (playerId) {
          authUser = {
            ...authUser,
            playerId,
          };
        }
      }

      let dbPlayer = null;
      if (playerId) {
        dbPlayer = await db.query.players.findFirst({
          where: eq(schema.players.id, playerId),
        });
      } else if (account) {
        const parsedOsuId = parseOsuId(account.accountId);
        if (parsedOsuId !== null) {
          dbPlayer = await db.query.players.findFirst({
            where: eq(schema.players.osuId, parsedOsuId),
          });

          if (dbPlayer && !authUser.playerId) {
            authUser = {
              ...authUser,
              playerId: dbPlayer.id,
            };
          }
        }
      }

      const dbUser = dbPlayer
        ? await db.query.users.findFirst({
            where: eq(schema.users.playerId, dbPlayer.id),
          })
        : null;

      const osuId = dbPlayer?.osuId ?? parseOsuId(account?.accountId);

      return {
        user: {
          ...authUser,
          osuId,
        },
        session,
        dbPlayer,
        dbUser,
      };
    }),
    nextCookies(), // must be the last plugin
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path ?? '';
      const newSession = ctx.context.newSession;

      const formatActor = (candidate: unknown): string => {
        if (!candidate || typeof candidate !== 'object') {
          return 'anonymous';
        }

        const sessionCandidate = candidate as {
          user?: { osuId?: number | string | null } | null;
          dbUser?: { id?: number | null } | null;
          dbPlayer?: { osuId?: number | string | bigint | null } | null;
        };

        const normalize = (value: unknown): string | null => {
          if (typeof value === 'bigint') {
            return value.toString();
          }

          if (typeof value === 'number' || typeof value === 'string') {
            return String(value);
          }

          return null;
        };

        const parts: string[] = [];

        if (sessionCandidate.dbUser?.id != null) {
          parts.push(`user:${sessionCandidate.dbUser.id}`);
        }

        const osuId =
          normalize(sessionCandidate.user?.osuId) ??
          normalize(sessionCandidate.dbPlayer?.osuId);

        if (osuId) {
          parts.push(`osu:${osuId}`);
        }

        return parts.length > 0 ? parts.join(' ') : 'anonymous';
      };

      const logAuthEvent = (
        level: 'info' | 'error',
        message: string,
        extra?: Record<string, string | number | undefined>
      ) => {
        const parts = [`[auth] ${message}`];

        Object.entries(extra ?? {}).forEach(([key, value]) => {
          if (value === undefined) {
            return;
          }

          parts.push(`${key}=${value}`);
        });

        const line = parts.join(' ');

        if (level === 'error') {
          console.error(line);
          return;
        }

        console.info(line);
      };

      if (newSession) {
        const actor = formatActor(newSession);
        const sessionId =
          (newSession as { session?: { id?: string; sessionId?: string } })
            .session?.id ??
          (newSession as { session?: { id?: string; sessionId?: string } })
            .session?.sessionId;

        logAuthEvent('info', 'login', {
          path,
          user: actor,
          session: sessionId,
        });

        return;
      }

      if (path === '/sign-out') {
        const actor = formatActor(
          ctx.context.session ?? ctx.context.newSession
        );
        const returned = ctx.context.returned;
        const isError = returned instanceof APIError;

        const errorDetail = isError
          ? typeof (returned as { code?: unknown }).code === 'string'
            ? (returned as { code?: string }).code
            : (returned as { message?: string }).message
          : undefined;

        logAuthEvent(isError ? 'error' : 'info', 'logout', {
          user: actor,
          status: isError ? 'error' : 'ok',
          path,
          error: errorDetail,
        });
      }
    }),
  },
});

export type AppSession = typeof auth.$Infer.Session;
