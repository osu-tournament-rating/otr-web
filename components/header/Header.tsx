'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, Menu, Trophy, Upload, X } from 'lucide-react';
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
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../ui/navigation-menu';
import { Separator } from '../ui/separator';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../ui/sheet';

type NavItem = {
  title: string;
  href: string;
  dropdown?: {
    title: string;
    href: string;
    icon: LucideIcon;
  }[];
};

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
              {navItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.dropdown ? (
                    <>
                      <NavigationMenuTrigger
                        className={cn(
                          'bg-secondary hover:cursor-pointer hover:bg-secondary hover:text-primary focus:bg-secondary focus:outline-none',
                          pathname.startsWith(item.href) &&
                            'font-extrabold text-primary focus:text-primary'
                        )}
                      >
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="py-1">
                          <Link
                            href={item.href}
                            className={cn(
                              'flex flex-row items-center gap-2 px-2 py-1.5 text-sm font-medium',
                              pathname === item.href &&
                                'font-medium text-primary'
                            )}
                          >
                            View All {item.title}
                          </Link>
                          {item.dropdown.map((dropdownItem) => (
                            <NavigationMenuLink
                              key={dropdownItem.title}
                              asChild
                              className={cn(
                                'flex flex-row items-center gap-2 text-sm',
                                pathname === dropdownItem.href &&
                                  'font-medium text-primary'
                              )}
                            >
                              <Link href={dropdownItem.href}>
                                <div className="flex items-center gap-2">
                                  <dropdownItem.icon className="h-4 w-4" />
                                  <p>{dropdownItem.title}</p>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </>
                  ) : (
                    <NavigationMenuLink
                      asChild
                      className={cn(
                        'transition-colors hover:bg-secondary hover:text-primary focus:bg-secondary focus:outline-none',
                        pathname.startsWith(item.href) &&
                          'font-extrabold text-primary focus:text-primary'
                      )}
                    >
                      <Link href={item.href}>{item.title}</Link>
                    </NavigationMenuLink>
                  )}
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
                  {navItems.map((item) => (
                    <NavigationMenuItem className="w-full" key={item.title}>
                      {item.dropdown ? (
                        <>
                          {/* Main link for mobile */}
                          <NavigationMenuLink
                            asChild
                            className={cn(
                              navigationMenuTriggerStyle(),
                              'w-full bg-secondary text-lg transition-colors hover:bg-transparent hover:text-primary',
                              pathname.startsWith(item.href) &&
                                'font-extrabold text-primary focus:text-primary'
                            )}
                          >
                            <Link href={item.href}>{item.title}</Link>
                          </NavigationMenuLink>

                          {/* Dropdown items for mobile */}
                          {item.dropdown.map((dropdownItem) => (
                            <NavigationMenuLink
                              key={dropdownItem.title}
                              asChild
                              className={cn(
                                navigationMenuTriggerStyle(),
                                'flex w-full items-center gap-2 bg-secondary pl-8 text-lg transition-colors hover:bg-transparent hover:text-primary',
                                pathname === dropdownItem.href &&
                                  'font-medium text-primary'
                              )}
                            >
                              <Link href={dropdownItem.href}>
                                <div className="flex items-center gap-2">
                                  <dropdownItem.icon className="h-4 w-4" />
                                  {dropdownItem.title}
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          ))}
                        </>
                      ) : (
                        <NavigationMenuLink
                          asChild
                          className={cn(
                            navigationMenuTriggerStyle(),
                            'w-full bg-secondary text-lg transition-colors hover:bg-transparent hover:text-primary',
                            pathname.startsWith(item.href) &&
                              'font-extrabold text-primary focus:text-primary'
                          )}
                        >
                          <Link href={item.href}>{item.title}</Link>
                        </NavigationMenuLink>
                      )}
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
