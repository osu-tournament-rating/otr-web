'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  LogOut,
  Settings,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useMediaQuery, useToggle } from '@uidotdev/usehooks';

import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CountryFlag from '@/components/shared/CountryFlag';
import ProfileRoleBadge from '@/components/profile/ProfileRoleBadge';
import LoginButton from '@/components/buttons/LoginButton';
import { SheetClose } from '@/components/ui/sheet';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';
import { cn } from '@/lib/utils';
import { hasAdminScope } from '@/lib/auth/roles';
import { signOut, useSession as useAuthSession } from '@/lib/auth/auth-client';
import { SessionContext } from '@/components/session-provider';
import { orpc } from '@/lib/orpc/orpc';

type ProfileCardProps = {
  isMobileNav?: boolean;
};

type SessionData = ReturnType<typeof useAuthSession>['data'];
type DbPlayer = NonNullable<NonNullable<SessionData>['dbPlayer']>;

type UserAvatarProps = {
  player: DbPlayer;
  showNotificationDot?: boolean;
};

export default function ProfileCard({ isMobileNav = false }: ProfileCardProps) {
  const [isOpen, toggleIsOpen] = useToggle();
  const router = useRouter();
  const path = useAuthRedirectPath();
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');
  const sessionResult = useAuthSession();
  const { data: session, isPending: isSessionPending } = sessionResult;
  const error = (sessionResult as { error?: unknown }).error ?? null;
  const dbPlayer = session?.dbPlayer ?? null;
  const scopes = session?.dbUser?.scopes ?? [];
  const isAdmin = hasAdminScope(scopes);
  const isLoading = Boolean(isSessionPending);
  const { refreshSession } = useContext(SessionContext);
  const [unseenReportCount, setUnseenReportCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    orpc.reports.unseenCount({}).then((result) => {
      setUnseenReportCount(result.count);
    });
  }, [isAdmin]);

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          refreshSession(null);
          router.refresh();
          router.push(path);
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-muted h-9 w-9 animate-pulse rounded-full" />
      </div>
    );
  }

  if (!session || !dbPlayer || error) {
    return <LoginButton />;
  }

  const player = dbPlayer;

  const reportCountDisplay =
    unseenReportCount > 99 ? '99+' : unseenReportCount.toString();

  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={toggleIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="relative mb-2 w-full cursor-pointer overflow-hidden rounded-md md:hidden">
            <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute inset-0 backdrop-blur-md" />
              <Image
                src="/decorations/decoration-2.svg"
                alt="background image"
                width={300}
                height={200}
                className="size-full object-cover"
              />
            </div>
            <div className="relative z-10 flex items-center justify-between p-2">
              <div className="flex items-center gap-3">
                <UserAvatar
                  player={player}
                  showNotificationDot={unseenReportCount > 0}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{player.username}</span>
                  {player.country && (
                    <CountryFlag
                      country={player.country}
                      width={16}
                      height={11}
                      className="flex-shrink-0"
                    />
                  )}
                  {scopes.length > 0 && <ProfileRoleBadge scopes={scopes} />}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {isMobileNav ? (
            <SheetClose asChild>
              <Link
                href={`/players/${player.id}`}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <User className="size-4" />
                <span>My Profile</span>
              </Link>
            </SheetClose>
          ) : (
            <Link
              href={`/players/${player.id}`}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <User className="size-4" />
              <span>My Profile</span>
            </Link>
          )}

          {isMobileNav ? (
            <SheetClose asChild>
              <Link
                href="/settings"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SheetClose>
          ) : (
            <Link
              href="/settings"
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </Link>
          )}

          {isAdmin && (
            <>
              <hr className="border-border my-1" />
              {isMobileNav ? (
                <>
                  <SheetClose asChild>
                    <Link
                      href="/admin"
                      className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <ShieldAlert className="size-4" />
                      <span>Admin</span>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/admin/reports"
                      className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <AlertTriangle className="size-4" />
                      <span className="flex items-center gap-2">
                        Reports
                        {unseenReportCount > 0 && (
                          <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white">
                            {reportCountDisplay}
                          </span>
                        )}
                      </span>
                    </Link>
                  </SheetClose>
                </>
              ) : (
                <>
                  <Link
                    href="/admin"
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <ShieldAlert className="size-4" />
                    <span>Admin</span>
                  </Link>
                  <Link
                    href="/admin/reports"
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <AlertTriangle className="size-4" />
                    <span className="flex items-center gap-2">
                      Reports
                      {unseenReportCount > 0 && (
                        <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white">
                          {reportCountDisplay}
                        </span>
                      )}
                    </span>
                  </Link>
                </>
              )}
            </>
          )}

          <hr className="border-border my-1" />
          <button
            className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={toggleIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="cursor-pointer focus:outline-none"
        >
          <UserAvatar
            player={player}
            showNotificationDot={unseenReportCount > 0}
          />
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card mt-1 w-56 rounded-xl">
        <DropdownMenuLabel className="relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 backdrop-blur-md" />
            <Image
              src="/decorations/decoration-2.svg"
              alt="background image"
              width={300}
              height={200}
              className="size-full object-cover"
            />
          </div>
          <div className="relative z-10 flex flex-col items-center py-1">
            <div className="flex items-center gap-2">
              <p className="text-sm leading-none">
                <span className="font-bold">
                  {player.username ?? 'Username'}
                </span>
              </p>
              {player.country && (
                <CountryFlag
                  country={player.country}
                  width={16}
                  height={11}
                  className="flex-shrink-0"
                />
              )}
              {scopes.length > 0 && <ProfileRoleBadge scopes={scopes} />}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/players/${player.id}`}>
            <User className="mr-2 size-4" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin">
                <ShieldAlert className="mr-2 size-4" />
                <span>Admin</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/reports">
                <AlertTriangle className="mr-2 size-4" />
                <span className="flex items-center gap-2">
                  Reports
                  {unseenReportCount > 0 && (
                    <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white">
                      {reportCountDisplay}
                    </span>
                  )}
                </span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive hover:bg-destructive/10 focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserAvatar({ player, showNotificationDot }: UserAvatarProps) {
  return (
    <div className="relative">
      <OsuAvatar
        osuId={player.osuId}
        username={player.username}
        size={36}
        className="hover:border-primary/80 transition-all"
        fallback={<User className="size-4" />}
      />
      {showNotificationDot && (
        <span className="absolute right-0 top-0 size-2.5 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
