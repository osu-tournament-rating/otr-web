'use client';

import { usePathname } from 'next/navigation';
import { NavigationMenuLink } from '../ui/navigation-menu';
import { cn } from '@/lib/utils';

export default function NavLink({
  href,
  name,
}: {
  href: string;
  name: string;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <NavigationMenuLink
      href={href}
      className={cn(
        'transition-colors hover:text-primary',
        isActive && 'font-extrabold'
      )}
    >
      {name}
    </NavigationMenuLink>
  );
}
