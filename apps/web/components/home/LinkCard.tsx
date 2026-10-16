import { BookOpen, Medal, Trophy, User } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Panel } from '@/components/kit/layout/Panel';
import { ROW_HOVER_TINT, ROW_TITLE_HOVER } from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';

type IconVariant = 'medal' | 'trophy' | 'book' | 'user';

const ICONS = {
  medal: Medal,
  trophy: Trophy,
  book: BookOpen,
  user: User,
} as const;

interface LinkCardProps {
  title: string;
  description: string;
  icon: IconVariant;
}

/** The text and icon of a home action card. */
export function HomeCardContent({
  title,
  description,
  icon,
  children,
}: LinkCardProps & { children?: React.ReactNode }) {
  const Icon = ICONS[icon];

  return (
    <>
      <Icon aria-hidden className="mt-1 size-6 shrink-0 text-primary" />
      <div className="flex flex-col gap-1">
        <h2 data-row-title className="text-xl font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground">{description}</p>
        {children}
      </div>
    </>
  );
}

/** The home action card frame: a panel that keeps its 24px padding. */
export const HOME_CARD_CLASSES = 'flex size-full flex-row gap-4 p-6';

/** A home action card that opens its page as a whole. */
export default function LinkCard({
  title,
  description,
  icon,
  className,
  ...rest
}: LinkCardProps & React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        'group block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
      {...rest}
    >
      <Panel
        as="div"
        className={cn(HOME_CARD_CLASSES, ROW_HOVER_TINT, ROW_TITLE_HOVER)}
      >
        <HomeCardContent title={title} description={description} icon={icon} />
      </Panel>
    </Link>
  );
}
