import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import {
  Zap,
  Crosshair,
  TrendingUp,
  Medal,
  Shield,
  Trophy,
  Swords,
  LucideIcon,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightStat, HighlightColor } from './MatchStatsUtils';
import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';

const AVATAR_SIZE = {
  WIDTH: 24,
  HEIGHT: 24,
} as const;

const TIER_ICON_SIZE = {
  WIDTH: 20,
  HEIGHT: 20,
} as const;

const ACHIEVEMENT_STATS = ['biggest-gain', 'top-scorer', 'accuracy'] as const;

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Crosshair,
  TrendingUp,
  Medal,
  Shield,
  Trophy,
  Swords,
};

const colorStyles: Record<HighlightColor, string> = {
  blue: 'border-blue-500/30 bg-blue-500/[0.08]',
  red: 'border-red-500/30 bg-red-500/[0.08]',
  purple: 'border-purple-500/30 bg-purple-500/[0.08]',
  orange: 'border-orange-500/30 bg-orange-500/[0.08]',
  green: 'border-green-500/30 bg-green-500/[0.08]',
  amber: 'border-amber-500/30 bg-amber-500/[0.08]',
} as const;

const iconColorStyles: Record<HighlightColor, string> = {
  blue: 'text-blue-500 dark:text-blue-400',
  red: 'text-red-500 dark:text-red-400',
  purple: 'text-purple-500 dark:text-purple-400',
  orange: 'text-orange-500 dark:text-orange-400',
  green: 'text-green-500 dark:text-green-400',
  amber: 'text-amber-500 dark:text-amber-400',
} as const;

const iconBgStyles: Record<HighlightColor, string> = {
  blue: 'bg-blue-500/15 dark:bg-blue-400/20',
  red: 'bg-red-500/15 dark:bg-red-400/20',
  purple: 'bg-purple-500/15 dark:bg-purple-400/20',
  orange: 'bg-orange-500/15 dark:bg-orange-400/20',
  green: 'bg-green-500/15 dark:bg-green-400/20',
  amber: 'bg-amber-500/15 dark:bg-amber-400/20',
} as const;

const accentColors: Record<HighlightColor, string> = {
  blue: 'text-blue-500 dark:text-blue-400',
  red: 'text-red-500 dark:text-red-400',
  purple: 'text-purple-500 dark:text-purple-400',
  orange: 'text-orange-500 dark:text-orange-400',
  green: 'text-green-500 dark:text-green-400',
  amber: 'text-amber-500 dark:text-amber-400',
} as const;

interface MatchStatsHighlightCardProps {
  stat: HighlightStat;
}

export default function MatchStatsHighlightCard({
  stat,
}: MatchStatsHighlightCardProps) {
  const Icon = iconMap[stat.icon] || TrendingUp;
  const [imageError, setImageError] = useState(false);

  const isAchievement = useMemo(
    () =>
      ACHIEVEMENT_STATS.includes(
        stat.id as (typeof ACHIEVEMENT_STATS)[number]
      ) || stat.isSpecial,
    [stat.id, stat.isSpecial]
  );

  const ariaLabel = useMemo(
    () =>
      `${stat.label}: ${stat.value}${stat.sublabel ? ` - ${stat.sublabel}` : ''}`,
    [stat.label, stat.value, stat.sublabel]
  );

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-xl border-2',
        'p-4',
        'h-full min-h-[115px]',
        'backdrop-blur-sm',
        colorStyles[stat.color]
      )}
      role="article"
      aria-label={ariaLabel}
    >
      <div className="flex h-full flex-col">
        {/* Header with icon and label */}
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex items-center justify-center',
                'h-8 w-8 rounded-lg',
                iconBgStyles[stat.color]
              )}
              aria-hidden="true"
            >
              <Icon className={cn('h-4 w-4', iconColorStyles[stat.color])} />
            </div>
            <div className="flex items-center gap-1">
              <h3 className="text-xs font-medium text-muted-foreground/80">
                {stat.label}
              </h3>
              {stat.helpText && (
                <SimpleTooltip content={stat.helpText}>
                  <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
                </SimpleTooltip>
              )}
            </div>
          </div>
        </div>

        {/* Value and player info */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="space-y-2">
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
              {stat.metric && (
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase">
                  {stat.metric}
                </span>
              )}
            </div>

            <div>
              {stat.tierIcon && (
                <div className="flex items-center gap-1.5">
                  <TierIcon
                    tier={stat.tierIcon.tier}
                    subTier={stat.tierIcon.subTier}
                    width={TIER_ICON_SIZE.WIDTH}
                    height={TIER_ICON_SIZE.HEIGHT}
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] font-medium text-muted-foreground sm:text-[11px] lg:text-[10px]">
                    {stat.tierIcon.tier}
                    {stat.tierIcon.subTier &&
                      ` ${stat.tierIcon.subTier === 1 ? 'I' : stat.tierIcon.subTier === 2 ? 'II' : 'III'}`}
                  </span>
                </div>
              )}

              {stat.player && (
                <Link
                  href={`/players/${stat.player.id}`}
                  className="group/player inline-flex items-center gap-1.5"
                >
                  <div className="relative flex-shrink-0">
                    {!imageError ? (
                      <Image
                        src={stat.player.avatarUrl}
                        alt={stat.player.username}
                        width={AVATAR_SIZE.WIDTH}
                        height={AVATAR_SIZE.HEIGHT}
                        className="rounded-full shadow-sm ring-2 ring-background transition-transform duration-200 group-hover/player:scale-110"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div
                        className="h-[24px] w-[24px] rounded-full bg-muted shadow-sm ring-2 ring-background"
                        role="img"
                        aria-label={`${stat.player.username} avatar placeholder`}
                      />
                    )}
                  </div>
                  <span className="truncate text-xs font-medium text-muted-foreground transition-colors group-hover/player:text-foreground">
                    {stat.player.username}
                  </span>
                </Link>
              )}

              {!stat.player && !stat.tierIcon && stat.sublabel && (
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.sublabel}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
