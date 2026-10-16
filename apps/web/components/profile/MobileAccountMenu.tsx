'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import Link from 'next/link';

import { NotificationDot } from '@/components/kit/status/NotificationDot';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SheetClose } from '@/components/ui/sheet';
import type { SessionUser } from '@/lib/auth/session-utils';

import {
  getAccountLinks,
  UNREAD_REPORT_UPDATES,
  useLogout,
} from './account-links';
import { AccountIdentity } from './AccountMenu';
import LoginButton from './LoginButton';

const ITEM_CLASSES =
  'flex h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

/**
 * The account section at the top of the phone menu: the same links as the
 * desktop account menu, under the visitor's name. Signed-out visitors get
 * the log-in button instead.
 */
export default function MobileAccountMenu({
  user,
  unreadReportUpdates,
}: {
  user: SessionUser | null;
  unreadReportUpdates: number;
}) {
  const logout = useLogout();

  if (!user) {
    return <LoginButton className="w-full" />;
  }

  const links = getAccountLinks({
    playerId: user.player.id,
    unreadReportUpdates,
  });

  return (
    <Collapsible>
      <CollapsibleTrigger
        data-testid="mobile-account-trigger"
        // Starts with the name the button shows, so voice control can say it.
        aria-label={
          unreadReportUpdates > 0
            ? `${user.player.username}, account menu (${UNREAD_REPORT_UPDATES.toLowerCase()})`
            : `${user.player.username}, account menu`
        }
        className="group relative block w-full cursor-pointer overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <AccountIdentity
          user={user}
          surface="card"
          avatarSize={36}
          className="p-2 pr-3"
          trailing={
            <>
              {unreadReportUpdates > 0 ? (
                <NotificationDot label={UNREAD_REPORT_UPDATES} />
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </>
          }
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5 pt-1">
          {links.map(({ title, href, icon: Icon, notification, testId }) => (
            <li key={href}>
              <SheetClose asChild>
                <Link
                  href={href}
                  prefetch={false}
                  data-testid={`mobile-${testId}`}
                  className={ITEM_CLASSES}
                >
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="flex-1">{title}</span>
                  {notification ? (
                    <NotificationDot label={notification} />
                  ) : null}
                </Link>
              </SheetClose>
            </li>
          ))}
          <li>
            <SheetClose asChild>
              <button
                type="button"
                className={ITEM_CLASSES}
                onClick={() => void logout()}
              >
                <LogOut
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                Log out
              </button>
            </SheetClose>
          </li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
