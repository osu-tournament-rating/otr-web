'use server';

import { fetchSession } from '@/lib/api/server';
import { revalidatePath } from 'next/cache';
import { clearRequestCache } from '@/lib/utils/request-cache';

/**
 * Server action to refresh the session and revalidate the current page
 * This is useful after authentication to ensure the session is properly established
 */
export async function refreshServerSession(path: string = '/') {
  try {
    // Clear any existing cached requests before fetching new session
    clearRequestCache('fetch-session');
    await fetchSession();
    revalidatePath(path, 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to refresh server session:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
}
