'use client';

import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  LucideIcon,
  Menu,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
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
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<
    Record<string, boolean>
  >(() => {
    const initialOpen: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.dropdown) {
        initialOpen[item.title] = item.dropdown.some(
          (dropdownItem) => pathname === dropdownItem.href
        );
      }
    });
    return initialOpen;
  });

  const toggleMobileDropdown = useCallback((title: string) => {
    setOpenMobileDropdowns((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

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
                            'font-extrabold text-primary focus:bg-secondary focus:text-primary'
                        )}
                      >
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="py-1">
                          {item.dropdown.map((dropdownItem) => (
                            <NavigationMenuLink
                              key={dropdownItem.title}
                              asChild
                              className={cn(
                                'flex flex-row items-center gap-2 text-sm',
                                pathname === dropdownItem.href &&
                                  'font-medium text-primary focus:text-primary'
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
              <NavigationMenu className="contents" orientation={'vertical'}>
                <div className="flex flex-col gap-y-4 px-2">
                  <LoginButton />
                  <Separator className="bg-muted" />
                </div>
                <NavigationMenuList className="flex-col">
                  {navItems.map((item) => (
                    <NavigationMenuItem className="w-full" key={item.title}>
                      {item.dropdown ? (
                        <>
                          {/* Dropdown trigger for mobile */}
                          <button
                            onClick={() => toggleMobileDropdown(item.title)}
                            className={cn(
                              'flex w-full justify-between bg-secondary px-2 py-2 text-lg transition-colors hover:cursor-pointer hover:bg-secondary hover:text-primary focus:bg-secondary',
                              pathname.startsWith(item.href) &&
                                'font-extrabold text-primary focus:text-primary'
                            )}
                          >
                            <span>{item.title}</span>
                            {openMobileDropdowns[item.title] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          {/* Dropdown items for mobile - only show when open */}
                          {openMobileDropdowns[item.title] && (
                            <div className="flex flex-col">
                              {item.dropdown.map((dropdownItem) => (
                                <NavigationMenuLink
                                  key={dropdownItem.title}
                                  asChild
                                  className={cn(
                                    // Change the pl to change indentation of dropdown menu elements
                                    'flex w-full items-start justify-start gap-2 bg-secondary px-4 py-2 pl-8 text-lg transition-colors hover:cursor-pointer hover:bg-secondary hover:text-primary focus:bg-secondary focus:text-foreground',
                                    pathname === dropdownItem.href &&
                                      'font-medium text-primary focus:text-primary'
                                  )}
                                >
                                  <Link href={dropdownItem.href}>
                                    <div className="flex w-full items-center justify-start gap-2 text-left">
                                      <dropdownItem.icon className="h-4 w-4" />
                                      <span>{dropdownItem.title}</span>
                                    </div>
                                  </Link>
                                </NavigationMenuLink>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <NavigationMenuLink
                          asChild
                          className={cn(
                            'w-full bg-secondary text-lg transition-colors hover:bg-secondary hover:text-primary focus:bg-secondary',
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
