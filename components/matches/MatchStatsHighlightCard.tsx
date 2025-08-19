import React, { useState } from 'react';
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
import { HighlightStat } from './MatchStatsUtils';
import TierIcon from '@/components/icons/TierIcon';

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Crosshair,
  TrendingUp,
  Medal,
  Shield,
  Trophy,
  Swords,
};

const colorStyles = {
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
};

const iconColorStyles = {
  blue: 'text-blue-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
};

const iconBgStyles = {
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
  orange: 'bg-orange-500/10',
  green: 'bg-green-500/10',
  amber: 'bg-amber-500/10',
};

interface MatchStatsHighlightCardProps {
  stat: HighlightStat;
}

export default function MatchStatsHighlightCard({
  stat,
}: MatchStatsHighlightCardProps) {
  const Icon = iconMap[stat.icon] || TrendingUp;
  const [imageError, setImageError] = useState(false);

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
      aria-label={`${stat.label}: ${stat.value}${stat.sublabel ? ` - ${stat.sublabel}` : ''}`}
    >
      <div className="flex h-full flex-col lg:flex-row lg:items-start lg:gap-2">
        {/* Icon Badge */}
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

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            {/* Label */}
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase sm:text-[11px] lg:text-[11px]">
              {stat.label}
            </p>

            {/* Value */}
            <p className="mt-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg lg:text-base xl:text-lg">
              {stat.value}
            </p>
          </div>

          {/* Player Info / Tier Info / Sublabel */}
          <div className="mt-1 lg:mt-0.5">
            {stat.tierIcon && (
              <div className="flex items-center gap-1.5">
                <TierIcon
                  tier={stat.tierIcon.tier}
                  subTier={stat.tierIcon.subTier}
                  width={16}
                  height={16}
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
                      width={18}
                      height={18}
                      className="rounded-full ring-1 ring-border/20 transition-transform duration-200 group-hover/player:scale-110"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="h-[18px] w-[18px] rounded-full bg-muted ring-1 ring-border/20" />
                  )}
                  {/* Status dot - only show for certain stats */}
                  {(stat.id === 'biggest-gain' ||
                    stat.id === 'top-scorer' ||
                    stat.id === 'accuracy') && (
                    <div
                      className={cn(
                        'absolute -right-0.5 -bottom-0.5',
                        'h-1.5 w-1.5 rounded-full',
                        'ring-1 ring-background',
                        stat.color === 'green'
                          ? 'bg-green-500'
                          : stat.color === 'blue'
                            ? 'bg-blue-500'
                            : stat.color === 'purple'
                              ? 'bg-purple-500'
                              : stat.color === 'red'
                                ? 'bg-red-500'
                                : stat.color === 'orange'
                                  ? 'bg-orange-500'
                                  : 'bg-amber-500'
                      )}
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
