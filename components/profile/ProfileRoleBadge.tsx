'use client';

import { Badge, badgeVariants } from '@/components/ui/badge';
import SimpleTooltip from '@/components/simple-tooltip';
import { useMemo } from 'react';
import { VariantProps } from 'class-variance-authority';
import { Roles } from '@osu-tournament-rating/otr-api-client';

interface ProfileRoleBadgeProps {
  scopes: string[];
  className?: string;
}

type RoleBadge = {
  label: string;
  tooltip: string;
} & VariantProps<typeof badgeVariants>;

export default function ProfileRoleBadge({
  scopes,
  className,
}: ProfileRoleBadgeProps) {
  // Memoize role determination to prevent unnecessary recalculations
  const roleBadges = useMemo(() => {
    const badges: RoleBadge[] = [];

    for (const role of scopes) {
      switch (role) {
        case Roles.Admin:
          badges.push({
            label: 'Admin',
            tooltip: 'Administrator',
            variant: 'destructive',
          });
          break;
        default:
          break;
      }
    }

    return badges;
  }, [scopes]);

  if (!roleBadges.length) {
    return null;
  }

  return (
    <div>
      {roleBadges.map(({ label, tooltip, variant }) => (
        <SimpleTooltip key={label} content={tooltip}>
          <Badge
            variant={variant}
            className={`h-5 px-1.5 py-0 text-xs ${className}`}
          >
            {label}
          </Badge>
        </SimpleTooltip>
      ))}
    </div>
  );
}
