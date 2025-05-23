'use server';

import { fetchSession } from '@/lib/api/server';
// import { clearRequestCache } from '@/lib/utils/request-cache';
import { redirect } from 'next/navigation';
// import { revalidatePath } from 'next/cache';

/**
 * Server action to handle auth callback - establishes session and redirects
 * This ensures the session is fully established before redirect happens
 */
export async function handleAuthCallback(redirectTo: string = '/') {
  // Fetch and establish the session
  const user = await fetchSession();

  if (!user) {
    throw new Error('Failed to establish session');
  }

  // Propogate forward
  redirect(redirectTo);
}
