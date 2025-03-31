'use client';

import { cn } from '@/lib/utils';
import { Menu, Search, X } from 'lucide-react';
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
  navigationMenuTriggerStyle,
} from '../ui/navigation-menu';
import { Separator } from '../ui/separator';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../ui/sheet';

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
              {navItems.map(({ title, href }) => (
                <NavigationMenuItem key={title}>
                  <Link href={href} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        'rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-primary focus:bg-muted focus:outline-none',
                        pathname.startsWith(href) &&
                          'font-semibold text-primary focus:text-primary'
                      )}
                    >
                      {title}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div>
          <div className="hidden items-center gap-3 md:flex">
            <SearchDialog />
            <ModeToggle />
            <div className="pl-1">
              <ProfileCard />
            </div>
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
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold mb-4">Account</h2>
                    <ProfileCard isMobile={true} />
                  </div>

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
