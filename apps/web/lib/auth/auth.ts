import { db } from '@/lib/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  admin as adminPlugin,
  customSession,
  genericOAuth,
} from 'better-auth/plugins';
import { ac, admin, superadmin, ADMIN_ROLES } from './auth-roles';
import { nextCookies } from 'better-auth/next-js';
import * as schema from '@otr/core/db/schema';
import { and, eq } from 'drizzle-orm';
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

const parseOsuId = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeUsername = (
  value: string | null | undefined,
  fallback: string
) => {
  const base = value && value.trim().length > 0 ? value.trim() : fallback;
  return base;
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

    let player = await db.query.players.findFirst({
      where: eq(schema.players.osuId, osuId),
    });

    const nowIso = new Date().toISOString();
    const profile = await fetchOsuProfile(account.accessToken);

    if (!player) {
      const fallbackName = authUser.name || `osu-${osuId}`;
      const [createdPlayer] = await db
        .insert(schema.players)
        .values({
          osuId,
          username: sanitizeUsername(profile?.username, fallbackName),
          country: sanitizeCountry(profile?.country_code),
          defaultRuleset: mapPlaymodeToRuleset(profile?.playmode),
          osuLastFetch: nowIso,
          osuTrackLastFetch: null,
        })
        .returning();

      player = createdPlayer;
    } else if (profile) {
      const sanitizedCountry = sanitizeCountry(profile.country_code);
      const updatePayload = {
        username: sanitizeUsername(
          profile.username,
          player.username || authUser.name || `osu-${osuId}`
        ),
        country: sanitizedCountry || player.country,
        defaultRuleset: mapPlaymodeToRuleset(profile.playmode),
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

    let appUser = await db.query.users.findFirst({
      where: eq(schema.users.playerId, player.id),
    });

    if (!appUser) {
      const [createdUser] = await db
        .insert(schema.users)
        .values({ playerId: player.id })
        .returning();

      appUser = createdUser;
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

            // osu! OAuth2 doesn't return email addresses, so we use a placeholder
            return {
              id: profile.id.toString(),
              email: `placeholder-${profile.id}`,
              name: profile.username,
              image: profile.avatar_url,
              emailVerified: false,
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
});

export type AppSession = typeof auth.$Infer.Session;
