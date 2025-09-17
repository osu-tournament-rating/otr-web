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
import * as schema from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        superadmin,
      },
      adminRoles: ADMIN_ROLES,
      defaultRole: 'user',
    }),
    genericOAuth({
      config: [
        {
          providerId: 'osu',
          clientId: process.env.OSU_CLIENT_ID,
          clientSecret: process.env.OSU_CLIENT_SECRET,
          authorizationUrl: 'https://osu.ppy.sh/oauth/authorize',
          tokenUrl: 'https://osu.ppy.sh/oauth/token',
          userInfoUrl: 'https://osu.ppy.sh/api/v2/me',
          scopes: ['identify', 'public', 'friends.read'],
          getUserInfo: async (tokens) => {
            const response = await fetch('https://osu.ppy.sh/api/v2/me', {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            });

            if (!response.ok) {
              return null;
            }

            const user = await response.json();

            // osu! OAuth2 doesn't return email addresses
            // We use a non-routable domain (.invalid) as a placeholder
            // The actual user identification is done via the osu! user ID
            return {
              id: user.id.toString(),
              email: user.email || `fake-mail-placeholder-${user.id}`,
              name: user.username,
              image: user.avatar_url,
              emailVerified: false, // Always false since osu! doesn't provide emails
            };
          },
        },
      ],
    }),
    customSession(async ({ user, session }) => {
      const account = await db.query.auth_accounts.findFirst({
        where: and(
          eq(schema.auth_accounts.userId, user.id),
          eq(schema.auth_accounts.providerId, 'osu')
        ),
      });

      const parsedOsuId = account ? Number(account.accountId) : null;
      const osuId =
        typeof parsedOsuId === 'number' && !Number.isNaN(parsedOsuId)
          ? parsedOsuId
          : null;

      return {
        user: {
          ...user,
          osuId,
        },
        session,
      };
    }),
    nextCookies(), // must be the last plugin
  ],
});

export type AppSession = typeof auth.$Infer.Session;
