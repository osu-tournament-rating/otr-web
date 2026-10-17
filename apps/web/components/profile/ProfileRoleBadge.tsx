import { ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/kit/status/Badge';
import { hasAdminScope } from '@/lib/auth/roles';

/** The visitor's role in the account menu. Admin is the one role it shows. */
export default function ProfileRoleBadge({
  scopes,
  className,
}: {
  scopes: readonly string[];
  className?: string;
}) {
  if (!hasAdminScope(scopes)) {
    return null;
  }

  return (
    <Badge size="sm" className={className}>
      <ShieldCheck aria-hidden />
      Admin
    </Badge>
  );
}
