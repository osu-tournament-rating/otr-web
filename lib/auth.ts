import { db } from '@/app/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
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

            return {
              id: user.id.toString(),
              email: user.email || `${user.id}@osu.local`,
              name: user.username,
              image: user.avatar_url,
              emailVerified: false,
            };
          },
        },
      ],
    }),
  ],
});
