'use client';

import { Gamepad2, Swords, Target, Trophy } from 'lucide-react';

import { ReportEntityType } from '@otr/core/osu';

import { Badge } from '@/components/ui/badge';

const ENTITY_CONFIG = {
  [ReportEntityType.Tournament]: {
    label: 'Tournament',
    icon: Trophy,
    className:
      'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  },
  [ReportEntityType.Match]: {
    label: 'Match',
    icon: Swords,
    className:
      'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  },
  [ReportEntityType.Game]: {
    label: 'Game',
    icon: Gamepad2,
    className:
      'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  },
  [ReportEntityType.Score]: {
    label: 'Score',
    icon: Target,
    className:
      'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30',
  },
} as const;

export default function AuditEntityBadge({
  entityType,
}: {
  entityType: ReportEntityType;
}) {
  const config = ENTITY_CONFIG[entityType];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
