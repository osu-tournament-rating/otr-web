'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, Menu, Trophy, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ProfileCard from '../profile/ProfileCard';
import SearchDialog from '../search/SearchDialog';
import { Button } from '../ui/button';
import { DialogTitle } from '../ui/dialog';
import { ModeToggle } from '../ui/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '../ui/navigation-menu';
import { Separator } from '../ui/separator';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../ui/sheet';
import ClientOnly from '../client-only';

type NavItem = {
  title: string;
  href: string;
  dropdown?: SubNavItem[];
};

type SubNavItem = {
  icon: LucideIcon;
} & Omit<NavItem, 'dropdown'>;

const newNavItems: NavItem[] = [
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

const navItems = [
  {
    title: 'Leaderboard',
    href: '/leaderboard',
  },
  {
    title: 'Tournaments',
    href: '/tournaments',
  },
] as const satisfies {
  title: string;
  href: string;
}[];

export default function Header() {
  const pathname = usePathname();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b-muted bg-secondary px-4 shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between">
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
              {newNavItems.map((item) => (
                <NavigationItem key={item.title} {...item} />
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div>
          <div className="hidden items-center gap-3 md:flex">
            <SearchDialog />
            <ModeToggle />
            <ClientOnly>
              <ProfileCard />
            </ClientOnly>
          </div>

          {/* Mobile menu */}
          <div className="flex items-center gap-2 md:hidden">
            <SearchDialog />
            <ModeToggle />

            <Sheet modal={false} onOpenChange={setIsMobileNavOpen}>
              {!isMobileNavOpen ? (
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              ) : (
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              )}
              <SheetContent
                overlay={false}
                closeButton={false}
                className="inset-y-16 w-full border-t border-t-muted border-l-muted bg-secondary p-6 sm:max-w-xs md:hidden"
              >
                {/* Required for screen reader */}
                <DialogTitle hidden />

                <div className="flex flex-col space-y-6">
                  <ClientOnly>
                    <ProfileCard />
                  </ClientOnly>
                  <Separator className="bg-muted" />
                  <nav className="flex flex-col space-y-1">
                    {navItems.map(({ title, href }) => (
                      <SheetClose asChild key={title}>
                        <Link
                          href={href}
                          className={cn(
                            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                            pathname.startsWith(href) &&
                              'bg-muted font-semibold text-primary'
                          )}
                        >
                          {title}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function WrapNavigationItem({
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
      className={cn(
        'bg-transparent hover:cursor-pointer hover:bg-transparent hover:text-primary focus:bg-secondary focus:outline-none data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent',
        active &&
          'font-extrabold text-primary focus:bg-secondary focus:text-primary'
      )}
    >
      {children}
    </NavigationMenuTrigger>
  );
}

function NavigationItem({ title, href, dropdown }: NavItem) {
  const isActive = usePathname().startsWith(href);
  const hasDropdown = !!dropdown;

  return (
    <NavigationMenuItem key={title}>
      <WrapNavigationItem active={isActive} dropdown={hasDropdown}>
        <Link href={href} legacyBehavior passHref>
          <NavigationMenuLink
            className={cn(
              'transition-colors hover:bg-secondary hover:text-primary focus:bg-secondary focus:outline-none',
              isActive && 'font-bold text-primary focus:text-primary',
              hasDropdown && 'bg-transparent hover:bg-transparent'
            )}
          >
            {title}
          </NavigationMenuLink>
        </Link>
      </WrapNavigationItem>
      {hasDropdown && <SubNavigation items={dropdown} />}
    </NavigationMenuItem>
  );
}

function SubNavigation({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <NavigationMenuContent className="right-0 group-data-[viewport=false]/navigation-menu:bg-secondary group-data-[viewport=false]/navigation-menu:rounded-xl">
      {items.map(({ title, href, icon: Icon }) => (
        <Link
          legacyBehavior
          passHref
          key={title}
          href={href}
        >
          <NavigationMenuLink
            className={cn(
              'flex flex-row items-center gap-2 text-sm hover:text-foreground',
              isActive(href) && 'font-semibold text-primary hover:text-primary focus:text-primary'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={isActive(href) ? 'text-primary' : ''} />
              <p>{title}</p>
            </div>
          </NavigationMenuLink>
        </Link>
      ))}
    </NavigationMenuContent>
  );
}
