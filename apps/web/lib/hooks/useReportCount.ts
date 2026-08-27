'use client';

import { useEffect, useState } from 'react';

import { orpc } from '@/lib/orpc/orpc';

const listeners = new Set<() => void>();

export function notifyReportChange() {
  for (const listener of [...listeners]) listener();
}

export function useReportCount(userId: number | null, isAdmin: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let latest = 0;

    const load = () => {
      const request = ++latest;
      const pending = isAdmin
        ? orpc.reports.unseenCount({})
        : orpc.reports.myUnreadCount({});

      pending
        .then((result) => {
          if (active && request === latest) setCount(result.count);
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

  return count;
}
