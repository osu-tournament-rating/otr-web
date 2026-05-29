import { createAuthClient } from 'better-auth/react';
import {
  customSessionClient,
  genericOAuthClient,
} from 'better-auth/client/plugins';
import { apiKeyClient } from '@better-auth/api-key/client';
import type { auth } from './auth';

const resolveBaseURL = (): string | undefined => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_BASE_URL;
};

const baseURL = resolveBaseURL();

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    customSessionClient<typeof auth>(),
    genericOAuthClient(),
    apiKeyClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
