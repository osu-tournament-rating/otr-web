import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000',
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
