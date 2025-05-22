'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, LucideIcon, Trophy, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ProfileCard from '../profile/ProfileCard';
import SearchDialog from '../search/SearchDialog';
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

type NavItem = {
  title: string;
  href: string;
  dropdown?: SubNavItem[];
};

type SubNavItem = {
  icon: LucideIcon;
} & Omit<NavItem, 'dropdown'>;

const navItems: NavItem[] = [
  {
    title: 'Leaderboard',
    href: '/leaderboard',
  },
  {
    title: 'Tournaments',
    href: '/tournaments',
    dropdown: [
      {
        title: 'Browse',
        href: '/tournaments',
        icon: Trophy,
      },
      {
        title: 'Submit',
        href: '/tournaments/submit',
        icon: Upload,
      },
    ],
  },
];

export default function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="h-(--header-height-px) border-b-muted bg-card sticky top-0 z-50 flex w-full flex-row items-center justify-between border-b px-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={'/logos/small.svg'}
            alt="o!TR Logo"
            width={36}
            height={36}
            className="transition-transform hover:scale-105"
          />
        </Link>

        {/* Main nav */}
        <NavigationMenu viewport={false} className="hidden md:flex">
          <NavigationMenuList className="gap-1">
            {navItems.map((item) => (
              <NavigationItem key={item.title} {...item} />
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="flex items-center gap-2">
        <SearchDialog />
        <ModeToggle />
        <SupportButton />
        <div className="hidden md:block">
          <ClientOnly>
            <ProfileCard />
          </ClientOnly>
        </div>

        {/* Mobile menu */}
        <Sheet modal={false} onOpenChange={setIsMobileNavOpen}>
          <MobileNavTrigger isOpen={isMobileNavOpen} />
          <SheetContent
            overlay={false}
            closeButton={false}
            className="border-t-muted border-l-muted bg-card inset-y-16 w-full border-t p-6 sm:max-w-xs md:hidden"
          >
            {/* Required for screen reader */}
            <DialogTitle hidden />

            <div className="flex flex-col space-y-6">
              <ClientOnly>
                <ProfileCard />
              </ClientOnly>
              <Separator className="bg-muted" />
              <nav className="flex flex-col space-y-1">
                <NavigationMenu
                  viewport={false}
                  className="contents justify-start"
                >
                  <NavigationMenuList className="flex flex-1 flex-col items-start gap-1">
                    {navItems.map((item) => (
                      <NavigationItem isMobile key={item.title} {...item} />
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
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
}: {
  dropdown: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!dropdown) {
    return children;
  }

  return (
    <NavigationMenuTrigger
      data-slot="navigation-menu-trigger"
      className={cn(
        'hover:bg-accent data-[state=open]:bg-accent group inline-flex h-9 w-full items-center justify-start transition-[color,box-shadow] hover:cursor-pointer md:hover:bg-transparent md:data-[state=open]:bg-transparent',
        active && 'bg-accent md:bg-transparent'
      )}
    >
      {children}
      <ChevronDown
        className="relative top-[1px] size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuTrigger>
  );
}

function NavigationItem({
  title,
  href,
  dropdown,
  isMobile = false,
}: NavItem & { isMobile?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  const hasDropdown = !!dropdown;

  return (
    <NavigationMenuItem className="w-full">
      <SubnavTrigger active={isActive} dropdown={hasDropdown}>
        <NavLink
          isMobile={isMobile}
          href={href}
          className={cn(
            'bg-transparent hover:bg-transparent',
            !hasDropdown &&
              'hover:bg-accent focus:bg-accent md:hover:bg-transparent md:focus:bg-transparent',
            isActive && 'bg-accent text-primary font-bold md:bg-transparent'
          )}
        >
          {title}
        </NavLink>
      </SubnavTrigger>
      {/* Subnav */}
      {hasDropdown && (
        <NavigationMenuContent
          className={
            '!bg-card right-0 !rounded-xl !border-0 pr-2 md:!rounded-t-none'
          }
        >
          {/* Seamlessly extend the nav border */}
          <div className="h-10/11 border-muted pointer-events-none absolute bottom-0 left-0 hidden w-full rounded-b-xl border border-t-0 bg-transparent md:block" />
          {dropdown.map(({ title, href, icon: Icon }) => (
            <NavLink
              isMobile={isMobile}
              key={title}
              href={href}
              className={cn(
                'hover:bg-accent md:hover:bg-transparent',
                pathname === href &&
                  'bg-accent text-primary hover:text-primary focus:text-primary font-semibold md:bg-transparent'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    'hover:text-primary focus:text-primary size-5',
                    pathname === href && 'text-primary'
                  )}
                />
                <p>{title}</p>
              </div>
            </NavLink>
          ))}
        </NavigationMenuContent>
      )}
    </NavigationMenuItem>
  );
}
