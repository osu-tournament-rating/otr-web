'use client';

import { useEffect, useState } from 'react';

import { orpc } from '@/lib/orpc/orpc';

const listeners = new Set<() => void>();

export function notifyReportChange() {
  for (const listener of [...listeners]) listener();
}

/** A count as loaded, with whose count it is. */
type LoadedReportCount = { owner: string; count: number };

/** Whose count a loaded value belongs to. */
export const reportCountOwner = (userId: number, isAdmin: boolean) =>
  `${userId}:${isAdmin ? 'admin' : 'user'}`;

/**
 * The count to show: the loaded one while it belongs to this user and kind,
 * else 0 (signed out, or a different account still loading).
 */
export function currentReportCount(
  loaded: LoadedReportCount | undefined,
  userId: number | null,
  isAdmin: boolean
): number {
  if (!userId || loaded?.owner !== reportCountOwner(userId, isAdmin)) {
    return 0;
  }

  return loaded.count;
}

/**
 * The signed-in user's unread report updates, or for an admin the unseen
 * reports. Reads 0 without a user, so a count never outlives a sign-out or
 * carries over to the next account.
 */
export function useReportCount(userId: number | null, isAdmin: boolean) {
  const [loaded, setLoaded] = useState<LoadedReportCount>();

  useEffect(() => {
    if (!userId) return;

    const owner = reportCountOwner(userId, isAdmin);
    let active = true;
    let latest = 0;

    const load = () => {
      const request = ++latest;
      const pending = isAdmin
        ? orpc.reports.unseenCount({})
        : orpc.reports.myUnreadCount({});

      pending
        .then((result) => {
          if (active && request === latest) {
            setLoaded({ owner, count: result.count });
          }
        })
        .catch(() => {});
    };

    load();
    listeners.add(load);

    return () => {
      active = false;
      listeners.delete(load);
    };
  }, [isAdmin, userId]);

  return currentReportCount(loaded, userId, isAdmin);
}
