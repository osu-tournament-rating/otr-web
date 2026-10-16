'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NotificationDot } from '@/components/kit/status/NotificationDot';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { NavMenuAnchor } from './DesktopNav';
import {
  isMenuActive,
  isMenuLinkActive,
  isNavLinkActive,
  type NavEntry,
} from './navigation';

const ROW_CLASSES =
  'flex h-10 w-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-active:font-semibold data-active:text-link';

/**
 * The phone menu's navigation: the same entries as the desktop bar, with
 * each dropdown as a group that expands in place. The group holding the
 * current page starts open.
 */
export default function MobileNav({ entries }: { entries: NavEntry[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => {
          if (entry.kind === 'link') {
            const active = isNavLinkActive(pathname, entry.href);

            return (
              <li key={entry.title}>
                <SheetClose asChild>
                  <Link
                    href={entry.href}
                    data-testid={entry.testId}
                    data-active={active ? '' : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={ROW_CLASSES}
                  >
                    {entry.title}
                  </Link>
                </SheetClose>
              </li>
            );
          }

          const active = isMenuActive(pathname, entry);

          return (
            <li key={entry.title}>
              <Collapsible defaultOpen={active}>
                <CollapsibleTrigger
                  data-testid={entry.testId}
                  data-active={active ? '' : undefined}
                  className={cn(ROW_CLASSES, 'group cursor-pointer')}
                >
                  {entry.title}
                  {entry.notification ? (
                    <NotificationDot label={entry.notification} />
                  ) : null}
                  <ChevronDown
                    aria-hidden="true"
                    className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="flex flex-col gap-0.5 pt-0.5 pb-1 pl-3">
                    {entry.links.map((link) => (
                      <li key={link.href}>
                        <SheetClose asChild>
                          <NavMenuAnchor
                            link={link}
                            active={isMenuLinkActive(pathname, link)}
                            className="h-10 py-0"
                          />
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
