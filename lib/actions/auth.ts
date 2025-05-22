'use server';

import { redirect } from 'next/navigation';
import { clearSession } from '../api/server';

export async function login(redirectUrl: string) {
  // TODO: Client should provide a type-safe way to get the route of an endpoint
  redirect(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/login?redirectUri=${redirectUrl}`
  );
}

export async function logout(redirectUrl: string) {
  // TODO: Client should provide a type-safe way to get the route of an endpoint
  await clearSession();
  redirect(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/logout?redirectUri=${redirectUrl}`
  );
}
