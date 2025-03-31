'use client';

import { Badge } from '@/components/ui/badge';
import SimpleTooltip from '@/components/simple-tooltip';

type UserScope = 'submit' | 'verifier' | 'admin' | 'whitelist';

interface ProfileRoleBadgeProps {
  scopes: string | string[];
  className?: string;
}

export default function ProfileRoleBadge({ scopes, className }: ProfileRoleBadgeProps) {
  // Convert string to array if needed
  const scopeArray = typeof scopes === 'string' 
    ? scopes.split(' ').filter(Boolean) as UserScope[]
    : scopes as UserScope[];

  if (!scopeArray.length) return null;

  // Prioritize admin badge if present
  if (scopeArray.includes('admin')) {
    return (
      <SimpleTooltip content="Administrator">
        <Badge 
          variant="destructive" 
          className={`text-xs px-1.5 py-0 h-5 ${className}`}
        >
          Admin
        </Badge>
      </SimpleTooltip>
    );
  }

  // Show other roles
  const rolesToShow = scopeArray.filter(scope => 
    ['submit', 'verifier', 'whitelist'].includes(scope)
  );

  if (!rolesToShow.length) return null;

  // Display the first role with highest priority
  const roleMap: Record<UserScope, { label: string, tooltip: string }> = {
    'verifier': { label: 'Verifier', tooltip: 'Tournament Verifier' },
    'whitelist': { label: 'Whitelist', tooltip: 'Whitelisted User' },
    'submit': { label: 'Submit', tooltip: 'Can Submit Tournaments' },
    'admin': { label: 'Admin', tooltip: 'Administrator' }, // Fallback, won't actually be used
  };

  // Priority order: verifier > whitelist > submit
  const priorityOrder: UserScope[] = ['verifier', 'whitelist', 'submit'];
  const highestPriorityRole = priorityOrder.find(role => scopeArray.includes(role)) || 'submit';
  
  const { label, tooltip } = roleMap[highestPriorityRole];

  return (
    <SimpleTooltip content={tooltip}>
      <Badge 
        variant="outline" 
        className={`text-xs px-1.5 py-0 h-5 ${className}`}
      >
        {label}
      </Badge>
    </SimpleTooltip>
  );
}
