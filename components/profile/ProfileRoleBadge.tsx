'use client';

import { Badge } from '@/components/ui/badge';
import SimpleTooltip from '@/components/simple-tooltip';
import { useMemo } from 'react';

type UserScope = 'submit' | 'verifier' | 'admin' | 'whitelist';

interface ProfileRoleBadgeProps {
  scopes: string | string[];
  className?: string;
}

export default function ProfileRoleBadge({ scopes, className }: ProfileRoleBadgeProps) {
  // Convert string to array if needed with proper type safety
  const scopeArray = typeof scopes === 'string' 
    ? (scopes.split(' ').filter(Boolean) as UserScope[])
    : (scopes as UserScope[]);

  // Memoize role determination to prevent unnecessary recalculations
  const roleToDisplay = useMemo(() => {
    if (!scopeArray.length) return null;
    
    // TODO: Add support for other badges (verifier, whitelist, submit) in the future
    
    // Only display admin badge
    if (scopeArray.includes('admin')) {
      return {
        label: 'Admin',
        tooltip: 'Administrator',
        variant: 'destructive' as const
      };
    }
    
    return null;
  }, [scopeArray]);

  if (!roleToDisplay) return null;

  const { label, tooltip, variant } = roleToDisplay;

  return (
    <SimpleTooltip content={tooltip}>
      <Badge 
        variant={variant}
        className={`text-xs px-1.5 py-0 h-5 ${className}`}
      >
        {label}
      </Badge>
    </SimpleTooltip>
  );
}
