import Link from 'next/link';
import React from 'react';
import { Card } from '../ui/card';
import { Medal, Trophy, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconVariant = 'medal' | 'trophy' | 'book' | 'user';

const getIcon = (icon: IconVariant) => {
  switch (icon) {
    case 'medal':
      return <Medal size={24} />;
    case 'trophy':
      return <Trophy size={24} />;
    case 'book':
      return <BookOpen size={24} />;
    case 'user':
      return <User size={24} />;
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
  return (
    <Link className={cn('block', className)} {...rest}>
      <Card className="size-full flex-row gap-4 border border-none p-6 transition-colors hover:border hover:bg-accent">
        <div className="mt-1 text-primary">{getIcon(icon)}</div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </Card>
    </Link>
  );
}
