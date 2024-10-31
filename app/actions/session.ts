'use server';

import { SessionUser } from '@/lib/types';
import { getIronSession } from 'iron-session';
import { ironSessionOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Gets the current session
 * @returns The current session
 */
export async function getSession() {
  return await getIronSession<SessionUser>(cookies(), ironSessionOptions);
}

/**
 * Gets the raw data for the current session
 * @returns A {@link SessionUser} serialized as a plain object
 */
export async function getSessionData() {
  return JSON.parse(JSON.stringify((await getSession() as SessionUser)));
}