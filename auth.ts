import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import NextAuth from 'next-auth';
import { OAuthConfig } from 'next-auth/providers';

declare module 'next-auth' {
  interface User extends UserDTO {}
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
  token: `${process.env.OTR_API_ROOT}/oauth/authorize`,
  userinfo: {
    url: `${process.env.OTR_API_ROOT}/me`,
    async request({ tokens }: unknown) {
      const res = await fetch(`${process.env.OTR_API_ROOT}/me`, {
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
    jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    session({ token, session }) {
      (session.user as unknown) = token.user;
      session.user.id = session.user.player.userId!.toString();
      return session;
    },
  },
});
