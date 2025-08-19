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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightStat, HighlightColor } from './MatchStatsUtils';
import TierIcon from '@/components/icons/TierIcon';

const AVATAR_SIZE = {
  WIDTH: 18,
  HEIGHT: 18,
} as const;

const TIER_ICON_SIZE = {
  WIDTH: 16,
  HEIGHT: 16,
} as const;

const STATS_WITH_STATUS_DOT = [
  'biggest-gain',
  'top-scorer',
  'accuracy',
] as const;

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
  blue: 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 hover:bg-blue-500/10',
  red: 'border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10',
  purple:
    'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10',
  orange:
    'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 hover:bg-orange-500/10',
  green:
    'border-green-500/20 bg-green-500/5 hover:border-green-500/40 hover:bg-green-500/10',
  amber:
    'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10',
} as const;

const iconColorStyles: Record<HighlightColor, string> = {
  blue: 'text-blue-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
} as const;

const iconBgStyles: Record<HighlightColor, string> = {
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
  orange: 'bg-orange-500/10',
  green: 'bg-green-500/10',
  amber: 'bg-amber-500/10',
} as const;

const statusDotColors: Record<HighlightColor, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
} as const;

interface MatchStatsHighlightCardProps {
  stat: HighlightStat;
}

export default function MatchStatsHighlightCard({
  stat,
}: MatchStatsHighlightCardProps) {
  const Icon = iconMap[stat.icon] || TrendingUp;
  const [imageError, setImageError] = useState(false);

  const shouldShowStatusDot = useMemo(
    () =>
      STATS_WITH_STATUS_DOT.includes(
        stat.id as (typeof STATS_WITH_STATUS_DOT)[number]
      ),
    [stat.id]
  );

  const ariaLabel = useMemo(
    () =>
      `${stat.label}: ${stat.value}${stat.sublabel ? ` - ${stat.sublabel}` : ''}`,
    [stat.label, stat.value, stat.sublabel]
  );

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border transition-all duration-200',
        'p-3 sm:p-3 lg:p-2 xl:p-2.5',
        'hover:scale-[1.01] hover:shadow-md',
        'active:scale-[0.99]',
        'h-full min-h-[110px] lg:min-h-[95px]',
        colorStyles[stat.color]
      )}
      role="article"
      aria-label={ariaLabel}
    >
      <div className="flex h-full flex-col lg:flex-row lg:items-start lg:gap-2">
        <div className="mb-2 flex-shrink-0 lg:mb-0">
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'h-8 w-8 sm:h-8 sm:w-8 lg:h-9 lg:w-9',
              'rounded-lg',
              iconBgStyles[stat.color],
              'transition-transform duration-200 group-hover:scale-110'
            )}
            aria-hidden="true"
          >
            <Icon
              className={cn(
                'h-4 w-4 sm:h-4 sm:w-4 lg:h-4.5 lg:w-4.5',
                iconColorStyles[stat.color]
              )}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase sm:text-[11px] lg:text-[11px]">
              {stat.label}
            </p>

            <p className="mt-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg lg:text-base xl:text-lg">
              {stat.value}
            </p>
          </div>

          <div className="mt-1 lg:mt-0.5">
            {stat.tierIcon && (
              <div className="flex items-center gap-1.5">
                <TierIcon
                  tier={stat.tierIcon.tier}
                  subTier={stat.tierIcon.subTier}
                  width={TIER_ICON_SIZE.WIDTH}
                  height={TIER_ICON_SIZE.HEIGHT}
                  className="flex-shrink-0 transition-opacity group-hover:opacity-90"
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
                      className="rounded-full ring-1 ring-border/20 transition-transform duration-200 group-hover/player:scale-110"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div
                      className="h-[18px] w-[18px] rounded-full bg-muted ring-1 ring-border/20"
                      role="img"
                      aria-label={`${stat.player.username} avatar placeholder`}
                    />
                  )}
                  {shouldShowStatusDot && (
                    <div
                      className={cn(
                        'absolute -right-0.5 -bottom-0.5',
                        'h-1.5 w-1.5 rounded-full',
                        'ring-1 ring-background',
                        statusDotColors[stat.color]
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span className="truncate text-[10px] font-medium text-muted-foreground transition-colors group-hover/player:text-foreground sm:text-[11px] lg:text-[10px]">
                  {stat.sublabel || stat.player.username}
                </span>
              </Link>
            )}

            {!stat.player && !stat.tierIcon && stat.sublabel && (
              <p className="text-[10px] font-medium text-muted-foreground sm:text-[11px] lg:text-[10px]">
                {stat.sublabel}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
