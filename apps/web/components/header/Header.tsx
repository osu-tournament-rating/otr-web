'use client';

import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Clock,
  FileText,
  Filter,
  LucideIcon,
  Trophy,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ProfileCard from '../profile/ProfileCard';
import SearchCommandDialog from '../search/SearchCommandDialog';
import { DialogTitle } from '../ui/dialog';
import { ModeToggle } from '../ui/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuContent,
} from '../ui/navigation-menu';
import { NavigationMenuTrigger } from '@radix-ui/react-navigation-menu';
import { Separator } from '../ui/separator';
import { Sheet, SheetClose, SheetContent } from '../ui/sheet';
import ClientOnly from '../client-only';
import MobileNavTrigger from './MobileNavTrigger';
import SupportButton from '../buttons/SupportButton';
import DocsButton from '../buttons/DocsButton';
import SpecButton from '../buttons/SpecButton';
import { Roles } from '@otr/core/osu';
import { useSession as useAuthSession } from '@/lib/auth/auth-client';
import { useSession } from '@/lib/hooks/useSession';

type NavItem = {
  title: string;
  href: string;
  dropdown?: SubNavItem[];
  roles?: Roles[];
};

type SubNavItem = {
  icon: LucideIcon;
  requiresSession?: boolean;
} & Omit<NavItem, 'dropdown'>;

const navItems: NavItem[] = [
  {
    title: 'Leaderboard',
    href: '/leaderboard',
    roles: [],
  },
  {
    title: 'Tournaments',
    href: '/tournaments',
    roles: [],
    dropdown: [
      {
        title: 'Browse',
        href: '/tournaments',
        icon: Trophy,
        roles: [],
      },
      {
        title: 'Submit',
        href: '/tournaments/submit',
        icon: Upload,
        requiresSession: true,
        roles: [],
      },
    ],
  },
  {
    title: 'Beatmaps',
    href: '/beatmaps',
    roles: [],
  },
  {
    title: 'Stats',
    href: '/stats',
    roles: [],
  },
  {
    title: 'Tools',
    href: '/tools/filter',
    roles: [],
    dropdown: [
      {
        title: 'Registrant Filtering',
        href: '/tools/filter',
        icon: Filter,
        roles: [],
        requiresSession: true,
      },
      {
        title: 'Filter Reports',
        href: '/tools/filter-reports',
        icon: FileText,
        roles: [],
      },
      {
        title: 'Audit Logs',
        href: '/tools/audit-logs',
        icon: Clock,
        roles: [],
      },
    ],
  },
];

export default function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isPending: isSessionPending } = useAuthSession();
  const currentUser = useSession();
  const scopes = currentUser?.scopes ?? [];
  const hasSession = Boolean(currentUser);

  return (
    <>
      <header
        data-testid="header"
        className="sticky top-0 z-50 flex h-(--header-height-px) w-full flex-row items-center justify-between border-b border-b-muted bg-card px-4 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            data-testid="header-logo"
            className="flex items-center"
          >
            <Image
              src={'/logos/small.svg'}
              alt="o!TR Logo"
              width={36}
              height={36}
              className="transition-transform hover:scale-105"
            />
          </Link>

          <NavigationMenu viewport={false} className="hidden md:flex">
            <NavigationMenuList className="gap-1">
              {navItems.map((item) => (
                <NavigationItem
                  key={item.title}
                  {...item}
                  scopes={scopes}
                  hasSession={hasSession}
                />
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <SearchCommandDialog />
          <ModeToggle />
          <DocsButton />
          <SpecButton />
          <SupportButton />
          <ClientOnly>
            <div className="hidden md:ml-1 md:block">
              <ProfileCard />
            </div>
          </ClientOnly>

          <Sheet modal={false} onOpenChange={setIsMobileNavOpen}>
            <MobileNavTrigger isOpen={isMobileNavOpen} />
            <SheetContent
              overlay={false}
              closeButton={false}
              className="inset-y-16 w-full border-t border-t-muted border-l-muted bg-card p-6 sm:max-w-xs md:hidden"
            >
              {/* Radix requires a title */}
              <DialogTitle hidden />
              <div className="flex flex-col space-y-6">
                <nav className="flex flex-col space-y-1">
                  <NavigationMenu
                    viewport={false}
                    className="contents justify-start"
                  >
                    <ClientOnly>
                      <ProfileCard isMobileNav />
                    </ClientOnly>
                    <Separator />
                    <span className="py-2" />
                    <NavigationMenuList className="flex flex-1 flex-col items-start gap-1">
                      {navItems.map((item) => (
                        <NavigationItem
                          isMobile
                          key={item.title}
                          {...item}
                          scopes={scopes}
                          hasSession={hasSession}
                        />
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <ClientOnly>
        {!currentUser && !isSessionPending && (
          <div className="w-full bg-accent/50 py-1 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Some features are not available while signed out.
            </p>
          </div>
        )}
      </ClientOnly>
    </>
  );
}

function NavLink({
  isMobile,
  className,
  ...rest
}: { isMobile: boolean } & React.ComponentProps<typeof Link>) {
  const linkStyle =
    'flex flex-row gap-2 rounded-md p-2 text-sm transition-colors hover:text-primary focus:bg-transparent focus:text-primary';

  if (isMobile) {
    return (
      <SheetClose asChild>
        <Link className={cn(linkStyle, className)} {...rest} />
      </SheetClose>
    );
  }

  return <Link className={cn(linkStyle, className)} {...rest} />;
}

function SubnavTrigger({
  active,
  dropdown,
  children,
  hasDropdown,
  isMobile,
}: {
  dropdown: boolean;
  active: boolean;
  children: React.ReactNode;
  hasDropdown: boolean;
  isMobile: boolean;
}) {
  if (!dropdown) {
    return children;
  }

  return (
    <NavigationMenuTrigger
      data-slot="navigation-menu-trigger"
      className={cn(
        'group inline-flex h-9 w-full items-center justify-between px-2 transition-[color,box-shadow] hover:cursor-pointer hover:bg-accent data-[state=open]:bg-accent md:hover:bg-transparent md:data-[state=open]:bg-transparent',
        active && 'bg-accent md:bg-transparent'
      )}
      onPointerDown={
        hasDropdown && !isMobile
          ? (e: React.PointerEvent) => {
              if (e.pointerType !== 'mouse') {
                return;
              }
              e.preventDefault();
            }
          : undefined
      }
    >
      <span className="flex items-center">{children}</span>
      <ChevronDown
        className="relative top-px size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuTrigger>
  );
}

type NavigationItemProps = NavItem & {
  isMobile?: boolean;
  scopes: string[];
  hasSession: boolean;
};

function NavigationItem({
  title,
  href,
  dropdown,
  roles,
  isMobile = false,
  scopes,
  hasSession,
}: NavigationItemProps) {
  const pathname = usePathname();
  const hasDropdown = !!dropdown;
  const isActive = hasDropdown
    ? dropdown.some((item) => pathname.startsWith(item.href))
    : pathname.startsWith(href);

  const isVisible =
    roles?.length === 0 || roles?.some((role) => scopes.includes(role));

  const navTestId = `nav-${title.toLowerCase()}`;

  return (
    <NavigationMenuItem className={cn('w-full', !isVisible && 'hidden')}>
      <SubnavTrigger
        active={isActive}
        dropdown={hasDropdown}
        hasDropdown={hasDropdown}
        isMobile={isMobile}
      >
        {hasDropdown ? (
          <span
            data-testid={navTestId}
            className={cn(
              'flex flex-row gap-2 rounded-md text-sm transition-colors hover:text-primary focus:text-primary',
              isActive && 'font-bold text-primary'
            )}
          >
            {title}
          </span>
        ) : (
          <NavLink
            isMobile={isMobile}
            data-testid={navTestId}
            href={href}
            className={cn(
              'bg-transparent hover:bg-transparent',
              !hasDropdown &&
                'hover:bg-accent focus:bg-accent md:hover:bg-transparent md:focus:bg-transparent',
              isActive && 'bg-accent font-bold text-primary md:bg-transparent'
            )}
          >
            {title}
          </NavLink>
        )}
      </SubnavTrigger>
      {hasDropdown && (
        <NavigationMenuContent>
          {/* Extends the nav border */}
          <div className="pointer-events-none absolute bottom-0 left-0 hidden h-10/11 w-full rounded-b-xl border border-t-0 border-muted bg-transparent md:block" />
          {dropdown.map(
            ({ title, href, icon: Icon, roles, requiresSession }) => {
              const isHidden =
                (requiresSession && !hasSession) ||
                (roles &&
                  roles.length > 0 &&
                  !roles.some((role) => scopes.includes(role)));

              return (
                <NavLink
                  isMobile={isMobile}
                  key={title}
                  href={href}
                  hidden={isHidden}
                  className={cn(
                    'whitespace-nowrap hover:bg-accent md:hover:bg-transparent',
                    pathname === href &&
                      'bg-accent font-semibold text-primary hover:text-primary focus:text-primary md:bg-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        'size-5 hover:text-primary focus:text-primary',
                        pathname === href && 'text-primary'
                      )}
                    />
                    <p>{title}</p>
                  </div>
                </NavLink>
              );
            }
          )}
        </NavigationMenuContent>
      )}
    </NavigationMenuItem>
  );
}
