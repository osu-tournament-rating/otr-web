import { AuditActionType } from '@otr/core/osu';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AuditActionTypeEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';

const actionConfig = {
  [AuditActionType.Insert]: {
    icon: Plus,
    className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  },
  [AuditActionType.Update]: {
    icon: Pencil,
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  [AuditActionType.Delete]: {
    icon: Trash2,
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  },
} as const;

export default function AuditActionBadge({
  actionType,
}: {
  actionType: AuditActionType;
}) {
  const config = actionConfig[actionType];
  const Icon = config.icon;
  const metadata = AuditActionTypeEnumHelper.getMetadata(actionType);

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      <Icon className="size-3" />
      {metadata.text}
    </Badge>
  );
}
