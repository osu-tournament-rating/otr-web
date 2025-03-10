'use client';

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import LoginButton from '../buttons/LoginButton';
import Image from 'next/image';
import { ModeToggle } from '../ui/mode-toggle';
import NavLink from './NavLink';
import SearchDialog from '../search/SearchDialog';
import Link from 'next/link';

export default function Nav() {
  return (
    <NavigationMenu className="bg-secondary p-3">
      <div className="w-full">
        <NavigationMenuList className="justify-between">
          <div className="mx-3 flex items-center gap-3">
            <NavigationMenuItem>
              <Link href="/">
                <Image
                  src={'/logos/small.svg'}
                  alt="o!TR Logo"
                  width={36}
                  height={36}
                />
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavLink href="/leaderboard" name="Leaderboard" />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavLink href="/tournaments" name="Tournaments" />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <SearchDialog />
            </NavigationMenuItem>
          </div>
          <div className="mx-3 flex items-center gap-3">
            <NavigationMenuItem>
              <ModeToggle />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="https://docs.otr.stagec.xyz"
                target="_blank"
              >
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <LoginButton />
            </NavigationMenuItem>
          </div>
        </NavigationMenuList>
      </div>
    </NavigationMenu>
  );
}
