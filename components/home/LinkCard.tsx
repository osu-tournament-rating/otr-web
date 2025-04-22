import Link from 'next/link';
import React from 'react';
import { Card } from '../ui/card';
import { Medal, Trophy, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconVariant = 'medal' | 'trophy' | 'book';

const getIcon = (icon: IconVariant) => {
  switch (icon) {
    case 'medal':
      return Medal;
    case 'trophy':
      return Trophy;
    case 'book':
      return BookOpen;
  }
};

interface LinkCardProps {
  /** Card title */
  title: string;

  /** Card description */
  description: string;

  /** Display icon */
  icon: IconVariant;
}

export default function LinkCart({
  title,
  description,
  icon,
  className,
  ...rest
}: LinkCardProps & React.ComponentProps<typeof Link>) {
  const Icon = getIcon(icon);

  return (
    <Link className={cn('block', className)} {...rest}>
      <Card className="size-full flex-row gap-4 border border-card-alt-border bg-card-alt p-6 transition-colors hover:border-card-alt-hover hover:bg-card-alt-hover/30">
        <div className="mt-1 text-primary">
          <Icon size={24} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </Card>
    </Link>
  );
}
