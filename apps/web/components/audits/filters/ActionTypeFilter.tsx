'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';

import { AuditActionType } from '@otr/core/osu';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACTION_CONFIG = {
  [AuditActionType.Insert]: {
    label: 'Created',
    icon: Plus,
    activeClass:
      'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  },
  [AuditActionType.Update]: {
    label: 'Updated',
    icon: Pencil,
    activeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  [AuditActionType.Delete]: {
    label: 'Deleted',
    icon: Trash2,
    activeClass:
      'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  },
} as const;

const ACTION_ORDER = [
  AuditActionType.Insert,
  AuditActionType.Update,
  AuditActionType.Delete,
] as const;

interface ActionTypeFilterProps {
  selectedTypes: AuditActionType[];
  onToggle: (type: AuditActionType) => void;
}

export default function ActionTypeFilter({
  selectedTypes,
  onToggle,
}: ActionTypeFilterProps) {
  return (
    <div className="flex gap-1">
      {ACTION_ORDER.map((type) => {
        const config = ACTION_CONFIG[type];
        const Icon = config.icon;
        const isActive = selectedTypes.includes(type);

        return (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => onToggle(type)}
            className={cn('gap-1.5', isActive && config.activeClass)}
          >
            <Icon className="size-3.5" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
