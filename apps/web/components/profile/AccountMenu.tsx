'use client';

import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { IconButton } from '@/components/kit/controls/IconButton';
import { CountryFlag } from '@/components/kit/country/CountryFlag';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { SessionUser } from '@/lib/auth/session-utils';
import { cn } from '@/lib/utils';

import {
  getAccountLinks,
  UNREAD_REPORT_UPDATES,
  useLogout,
} from './account-links';
import { AvatarBackdrop } from './AvatarBackdrop';
import ProfileRoleBadge from './ProfileRoleBadge';

/**
 * The signed-in visitor's avatar and name over a blended copy of their
 * avatar, at the top of the account menu (desktop) and the phone menu. It is
 * all spans, so it can sit inside the phone menu's button.
 */
export function AccountIdentity({
  user,
  surface = 'popover',
  avatarSize = 40,
  trailing,
  className,
}: {
  user: SessionUser;
  surface?: 'popover' | 'card';
  avatarSize?: number;
  /** Placed at the far end over the same backdrop, such as a chevron. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  const { player, scopes } = user;

  return (
    <span
      className={cn(
        'relative isolate flex min-w-0 items-center gap-3 overflow-hidden',
        className
      )}
    >
      <AvatarBackdrop osuId={player.osuId} surface={surface} />
      <OsuAvatar
        osuId={player.osuId}
        username={player.username}
        size={avatarSize}
        className="shrink-0 ring-2 ring-background/60"
        fallback={<User className="size-4" aria-hidden />}
      />
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="flex max-w-full min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {player.username}
          </span>
          <CountryFlag code={player.country} size="sm" tooltip={false} />
        </span>
        <ProfileRoleBadge scopes={scopes} />
      </span>
      {trailing ? (
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {trailing}
        </span>
      ) : null}
    </span>
  );
}

/** The avatar button and its menu, from laptop width (1024px) up. */
export default function AccountMenu({
  user,
  unreadReportUpdates,
}: {
  user: SessionUser;
  unreadReportUpdates: number;
}) {
  const logout = useLogout();
  const links = getAccountLinks({
    playerId: user.player.id,
    unreadReportUpdates,
  });
  const hasUnread = unreadReportUpdates > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          data-testid="account-menu-trigger"
          label={
            hasUnread
              ? `Account menu (${UNREAD_REPORT_UPDATES.toLowerCase()})`
              : 'Account menu'
          }
          tooltip="Account menu"
          tooltipSide="bottom"
          size="default"
          // The avatar fills the button and grows a little on hover and
          // presses in on click, as it always has, in place of a fill.
          className="relative rounded-full hover:bg-transparent data-[state=open]:bg-transparent motion-safe:hover:scale-103 motion-safe:active:scale-97"
        >
          <OsuAvatar
            osuId={user.player.osuId}
            username={user.player.username}
            size={36}
            fallback={<User className="size-4" aria-hidden />}
          />
          {hasUnread ? (
            <NotificationDot
              placement="corner"
              label={UNREAD_REPORT_UPDATES}
              className="ring-card"
            />
          ) : null}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        data-testid="account-menu"
        className="w-64 rounded-lg p-0"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <AccountIdentity user={user} className="px-3 py-3" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1">
          {links.map(({ title, href, icon: Icon, notification, testId }) => (
            <DropdownMenuItem key={href} asChild className="cursor-pointer">
              <Link href={href} prefetch={false} data-testid={testId}>
                <Icon aria-hidden />
                <span className="flex-1">{title}</span>
                {notification ? <NotificationDot label={notification} /> : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="cursor-pointer"
            data-testid="account-menu-logout"
            onSelect={() => void logout()}
          >
            <LogOut aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
