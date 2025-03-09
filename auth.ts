import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import NextAuth, { User } from 'next-auth';
import { OAuthConfig } from 'next-auth/providers';
import { JWT } from 'next-auth/jwt';

/** Reasons why the session could not be authenticated */
export type SessionErrorType = 'RefreshToken' | 'Expired';

declare module 'next-auth' {
  interface User extends UserDTO {}

  interface Session {
    accessToken?: string;
    error?: SessionErrorType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    user?: User;
    error?: SessionErrorType;
  }
}

/**
 * Checks the expiration of a JWT (JSON Web Token)
 * @param token The token to check
 * @returns Whether or not the given token has expired
 */
function isJwtExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

const otrProvider: OAuthConfig<UserDTO> = {
  id: 'otr',
  name: 'osu! Tournament Rating',
  type: 'oauth',
  checks: ['pkce', 'state'],
  clientId: process.env.OSU_CLIENT_ID,
  authorization: {
    url: 'https://osu.ppy.sh/oauth/authorize',
    params: { scope: 'public friends.read' },
  },
  token: `${process.env.OTR_API_ROOT}/api/v1/oauth/authorize`,
  userinfo: {
    url: `${process.env.OTR_API_ROOT}/api/v1/me`,
    async request({ tokens }: unknown) {
      const res = await fetch(`${process.env.OTR_API_ROOT}/api/v1/me`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      return await res.json();
    },
  },
  profile(profile) {
    return {
      ...profile,
      id: `${profile.id}`,
    };
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: '/auth',
  providers: [otrProvider],
  callbacks: {
    async jwt({ token, user, account }) {
      // Store user data
      if (user) {
        token.user = user;
      }

      // Store tokens
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
      }

      if (!token.access_token || !token.refresh_token) {
        throw new TypeError('Missing access_token or refresh_token');
      }

      // Access is not expired, session is valid
      if (!isJwtExpired(token.access_token)) {
        return token;
      }

      // Access and refresh tokens expired, session cannot be refreshed
      if (isJwtExpired(token.refresh_token)) {
        return {
          ...token,
          error: 'Expired'
        };
      }

      // Try to refresh the access token
      try {
        const res = await fetch(`${process.env.OTR_API_ROOT}/api/v1/oauth/refresh?refreshToken=${token.refresh_token}`, {
          method: 'POST'
        });

        const tokensOrError = await res.json();
        // console.log('refresh response', tokensOrError);
        if (!res.ok) throw tokensOrError;

        const newTokens = tokensOrError as {
          access_token: string;
        };

        console.log('new token')
        return {
          ...token,
          access_token: newTokens.access_token
        };
      } catch (err) {
        console.error('Error refreshing access token', err);
        return {
          ...token,
          error: 'RefreshToken'
        };
      }
    },
    session({ token, session }) {
      const user = token.user;
      if (user) {
        user.id = user.player.userId!.toString();
      }

      return {
        ...session,
        user,
        accessToken: token.access_token,
        error: token.error
      };
    },
  },
});
