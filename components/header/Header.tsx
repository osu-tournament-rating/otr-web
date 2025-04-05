'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, Menu, Upload, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import LoginButton from '../buttons/LoginButton';
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
    dropdown: [
      {
        title: 'Submit',
        href: '/tournaments/submit',
        icon: Upload,
      },
    ],
  },
] as const satisfies {
  title: string;
  href: string;
  dropdown?: [
    {
      title: string;
      href: string;
      icon: LucideIcon;
    },
  ];
}[];

export default function Header() {
  const pathname = usePathname();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-b-muted bg-secondary px-4">
      <div className="flex h-16 w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <Link href="/">
            <Image
              src={'/logos/small.svg'}
              alt="o!TR Logo"
              width={36}
              height={36}
            />
          </Link>

          {/* Main nav */}
          <NavigationMenu viewport={false} className="hidden md:flex">
            <NavigationMenuList>
              {navItems.map(({ title, href }) => (
                <NavigationMenuItem key={title}>
                  <Link href={href} legacyBehavior passHref>
                  // Update to support dropdowns if present in navItems. Dropdown menu should look identical to the navigation element.
                  // when clicked, it should take the user to the base href present in the properties for the item. AI!
                    <NavigationMenuLink
                      className={cn(
                        'transition-colors hover:bg-secondary hover:text-primary focus:bg-secondary focus:outline-none',
                        pathname.startsWith(href) &&
                          'font-extrabold text-primary focus:text-primary'
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
          <div className="hidden items-center gap-2 md:flex">
            <SearchDialog />
            <ModeToggle />
            <LoginButton />
          </div>

          {/* Mobile hamburger menu */}
          <Sheet modal={false} onOpenChange={setIsMobileNavOpen}>
            {!isMobileNavOpen ? (
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            ) : (
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            )}
            <SheetContent
              overlay={false}
              closeButton={false}
              className="inset-y-16 w-full border-t border-t-muted border-l-muted bg-secondary p-2 sm:w-1/3 md:hidden"
            >
              {/* Required for screen reader */}
              <DialogTitle hidden />
              <NavigationMenu
                className="contents"
                orientation={'vertical'}
                viewport={false}
              >
                <div className="flex flex-col gap-y-4 px-2">
                  <LoginButton />
                  <Separator className="bg-muted" />
                </div>
                <NavigationMenuList className="flex-col">
                  {navItems.map(({ title, href }) => (
                    <NavigationMenuItem className="w-full" key={title}>
                      <Link href={href} legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            'w-full bg-secondary text-lg transition-colors hover:bg-transparent hover:text-primary',
                            pathname.startsWith(href) &&
                              'font-extrabold text-primary focus:text-primary'
                          )}
                        >
                          {title}
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
