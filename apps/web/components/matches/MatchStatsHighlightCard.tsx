import Link from 'next/link';
import {
  Crosshair,
  Gamepad2,
  HelpCircle,
  Swords,
  TrendingUp,
  Medal,
  Users,
  type LucideIcon,
} from 'lucide-react';

import SimpleTooltip from '@/components/simple-tooltip';
import TierIcon from '@/components/icons/TierIcon';
import TRText from '@/components/rating/TRText';
import { Card } from '@/components/ui/card';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { getTierString } from '@/lib/utils/tierData';
import { HighlightIcon, HighlightStat } from './MatchStatsUtils';

const iconMap: Record<HighlightIcon, LucideIcon> = {
  Swords,
  Users,
  Gamepad2,
  TrendingUp,
  Medal,
  Crosshair,
};

interface MatchStatsHighlightCardProps {
  stat: HighlightStat;
}

export default function MatchStatsHighlightCard({
  stat,
}: MatchStatsHighlightCardProps) {
  const Icon = iconMap[stat.icon];
  const ariaLabel = `${stat.label}: ${stat.value}${stat.sublabel ? `, ${stat.sublabel}` : ''}`;

  return (
    <Card
      className="h-full gap-0 border-0 bg-popover !p-4 shadow-none"
      role="article"
      aria-label={ariaLabel}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <span className="text-sm leading-tight text-muted-foreground">
              {stat.label}
            </span>
            {stat.helpText && (
              <SimpleTooltip content={stat.helpText}>
                <button
                  type="button"
                  className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`About ${stat.label}`}
                >
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                </button>
              </SimpleTooltip>
            )}
          </div>

          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tracking-tight tabular-nums">
              {stat.value}
            </span>
            {stat.metric &&
              (stat.metric === 'TR' ? (
                <TRText />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {stat.metric}
                </span>
              ))}
          </div>

          <div className="mt-1 flex min-h-6 min-w-0 items-center">
            {stat.player && (
              <Link
                href={`/players/${stat.player.id}`}
                className="flex min-w-0 items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <OsuAvatar
                  osuId={stat.player.osuId}
                  username={stat.player.username}
                  size={22}
                  className="shrink-0"
                />
                <span className="truncate">{stat.player.username}</span>
              </Link>
            )}

            {stat.tierIcon && (
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <TierIcon
                  tier={stat.tierIcon.tier}
                  subTier={stat.tierIcon.subTier}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
                <span className="truncate">
                  {getTierString(stat.tierIcon.tier, stat.tierIcon.subTier)}
                </span>
              </div>
            )}

            {!stat.player && !stat.tierIcon && stat.sublabel && (
              <span className="truncate text-xs text-muted-foreground">
                {stat.sublabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
