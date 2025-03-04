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
        'hover:text-primary transition-colors sm:text-sm sm:font-medium',
        isActive && 'underline underline-offset-4 decoration-1'
      )}
    >
      {name}
    </NavigationMenuLink>
  );
}