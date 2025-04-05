import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { NavigationMenuLink } from '../ui/navigation-menu';

type MobileNavItemProps = {
  item: {
    title: string;
    href: string;
    dropdown?: {
      title: string;
      href: string;
      icon: LucideIcon;
    }[];
  };
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
};

export default function MobileNavItem({
  item,
  pathname,
  isOpen,
  onToggle,
}: MobileNavItemProps) {
  if (!item.dropdown) {
    return (
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
    );
  }

  return (
    <>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full justify-between bg-secondary px-2 py-2 text-lg transition-colors hover:cursor-pointer hover:bg-secondary hover:text-primary focus:bg-secondary',
          pathname.startsWith(item.href) &&
            'font-extrabold text-primary focus:text-primary'
        )}
      >
        <span>{item.title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {item.dropdown.map((dropdownItem) => (
            <NavigationMenuLink
              key={dropdownItem.title}
              asChild
              className={cn(
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
  );
}
