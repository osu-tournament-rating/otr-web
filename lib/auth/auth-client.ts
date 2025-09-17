import { createAuthClient } from 'better-auth/react';
import {
  customSessionClient,
  genericOAuthClient,
} from 'better-auth/client/plugins';
import type { auth } from './auth';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000',
  plugins: [customSessionClient<typeof auth>(), genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
