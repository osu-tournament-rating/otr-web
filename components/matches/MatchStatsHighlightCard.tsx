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
  blue: 'border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5',
  red: 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5',
  purple:
    'border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-500/5',
  orange:
    'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5',
  green:
    'border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5',
  amber:
    'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5',
};

const iconColorStyles = {
  blue: 'text-blue-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  green: 'text-green-500',
  amber: 'text-amber-500',
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
        'group relative overflow-hidden border p-2.5 transition-all hover:scale-[1.02] hover:shadow-lg',
        colorStyles[stat.color]
      )}
      role="article"
      aria-label={`${stat.label}: ${stat.value}${stat.sublabel ? ` - ${stat.sublabel}` : ''}`}
    >
      <div className="absolute top-2 right-2" aria-hidden="true">
        <Icon
          className={cn(
            'h-3.5 w-3.5 transition-opacity group-hover:opacity-80',
            iconColorStyles[stat.color]
          )}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase opacity-80">
          {stat.label}
        </p>
        <p className="text-base leading-tight font-bold tracking-tight">
          {stat.value}
        </p>
        {stat.tierIcon && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <TierIcon
              tier={stat.tierIcon.tier}
              subTier={stat.tierIcon.subTier}
              width={16}
              height={16}
              className="transition-opacity group-hover:opacity-80"
            />
            <span className="text-[10px] text-muted-foreground">
              {stat.tierIcon.tier}
              {stat.tierIcon.subTier &&
                ` ${stat.tierIcon.subTier === 1 ? 'I' : stat.tierIcon.subTier === 2 ? 'II' : 'III'}`}
            </span>
          </div>
        )}
        {stat.player && (
          <Link
            href={`/players/${stat.player.id}`}
            className="flex items-center gap-1.5 pt-0.5 transition-colors hover:text-foreground"
          >
            {!imageError ? (
              <Image
                src={stat.player.avatarUrl}
                alt={stat.player.username}
                width={16}
                height={16}
                className="rounded-full ring-1 ring-border/20"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-muted" />
            )}
            <span className="text-[10px] text-muted-foreground transition-colors hover:text-foreground">
              {stat.sublabel || stat.player.username}
            </span>
          </Link>
        )}
        {!stat.player && !stat.tierIcon && stat.sublabel && (
          <p className="text-[10px] text-muted-foreground">{stat.sublabel}</p>
        )}
      </div>
    </Card>
  );
}
