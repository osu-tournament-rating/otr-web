'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import { entityTypeToSlug } from '@/app/server/oRPC/procedures/audit/helpers';
import { Button } from '@/components/ui/button';
import SimpleTooltip from '@/components/simple-tooltip';
import { cn } from '@/lib/utils';

export default function AuditButton({
  entityType,
  entityId,
  darkMode = false,
}: {
  entityType: AuditEntityType;
  entityId: number;
  darkMode?: boolean;
}) {
  const slug = entityTypeToSlug(entityType);
  const href = `/audit/${slug}/${entityId}`;

  return (
    <SimpleTooltip content="View audit history">
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6',
          darkMode
            ? 'hover:bg-white/20 hover:text-white'
            : 'hover:bg-black/15 hover:text-black dark:hover:bg-white/20 dark:hover:text-white'
        )}
      >
        <Link href={href} aria-label="View audit history">
          <Clock
            className={cn(
              'h-3 w-3',
              darkMode
                ? 'text-white/70 hover:text-white'
                : 'text-neutral-600 hover:text-black dark:text-white/70 dark:hover:text-white'
            )}
          />
        </Link>
      </Button>
    </SimpleTooltip>
  );
}
