'use client';

import { Flag, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useContext } from 'react';

import { SessionContext } from '@/components/session-provider';
import { signOut } from '@/lib/auth/auth-client';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';
import type { KitIcon } from '@/lib/kit/layout/icon';

export type AccountLink = {
  title: string;
  href: string;
  icon: KitIcon;
  /** Shows the notification dot after the label; the text is read aloud. */
  notification?: string;
  testId: string;
};

export const UNREAD_REPORT_UPDATES = 'Unread report updates';

/**
 * The account menu's links, the same on desktop and in the phone menu. My
 * reports lists the visitor's own reports for everyone, admins included;
 * the admin queue lives in the Admin menu.
 */
export function getAccountLinks({
  playerId,
  unreadReportUpdates,
}: {
  playerId: number;
  unreadReportUpdates: number;
}): AccountLink[] {
  return [
    {
      title: 'My profile',
      href: `/players/${playerId}`,
      icon: User,
      testId: 'account-menu-profile',
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      testId: 'account-menu-settings',
    },
    {
      title: 'My reports',
      href: '/reports',
      icon: Flag,
      notification: unreadReportUpdates > 0 ? UNREAD_REPORT_UPDATES : undefined,
      testId: 'account-menu-reports',
    },
  ];
}

/** Signs out, clears the session everywhere on the page and stays put. */
export function useLogout() {
  const router = useRouter();
  const path = useAuthRedirectPath();
  const { refreshSession } = useContext(SessionContext);

  return useCallback(async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          refreshSession(null);
          router.refresh();
          router.push(path);
        },
      },
    });
  }, [path, refreshSession, router]);
}
