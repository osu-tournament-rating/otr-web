import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import NextAuth from 'next-auth';
import { OAuthConfig } from 'next-auth/providers';

declare module 'next-auth' {
  interface User extends UserDTO {}

  interface Session {
    accessToken?: string;
    refreshToken?: string;
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
    jwt({ token, user, account }) {
      if (user) {
        token.user = user;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      return token;
    },
    session({ token, session }) {
      (session.user as unknown) = token.user;
      session.user.id = session.user.player.userId!.toString();

      session.accessToken = token.accessToken as (string | undefined);
      session.refreshToken = token.refreshToken as (string | undefined);

      return session;
    },
  },
});
