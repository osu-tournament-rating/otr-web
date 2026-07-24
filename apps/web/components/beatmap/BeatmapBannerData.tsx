import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import {
  Activity,
  BadgeCheck,
  Clock3,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Library,
  Star,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import AudioPreviewButton from '@/components/audio/AudioPreviewButton';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/beatmaps/star-rating-color';
import type {
  BeatmapStatsSummary,
  BeatmapWithDetails,
} from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapBannerData({
  beatmap,
  summary,
  verifiedPoolCount,
}: {
  beatmap: BeatmapWithDetails;
  summary: BeatmapStatsSummary;
  verifiedPoolCount: number;
}) {
  const displayRuleset = getBeatmapDisplayRuleset(
    beatmap.ruleset,
    beatmap.diffName
  );
  const rulesetLabel = getBeatmapRulesetLabel(
    beatmap.ruleset,
    beatmap.diffName
  );
  return (
    <div
      data-testid="beatmap-data-matte"
      className="bg-card text-card-foreground"
    >
      <div
        aria-label="Beatmap essentials"
        className="flex flex-wrap items-center gap-2 p-3.5 sm:gap-2.5 sm:p-4"
      >
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground">
          <RulesetIcon
            ruleset={displayRuleset}
            className="size-4 fill-current"
            aria-hidden="true"
          />
          <span className="text-foreground">{rulesetLabel}</span>
        </span>
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold"
          style={{
            backgroundColor: getStarRatingColor(beatmap.sr),
            color: getStarRatingForegroundColor(beatmap.sr),
          }}
          aria-label={`${beatmap.sr.toFixed(2)} star rating`}
        >
          <Star className="size-4 fill-current" aria-hidden="true" />
          {beatmap.sr.toFixed(2)}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-semibold tabular-nums">
          <Activity
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {Math.round(beatmap.bpm)} BPM
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-semibold tabular-nums">
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
          {formatSecondsToMinutesSeconds(beatmap.totalLength)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AudioPreviewButton
            beatmapsetOsuId={beatmap.beatmapset?.osuId}
            artist={beatmap.beatmapset?.artist}
            title={beatmap.beatmapset?.title}
            difficulty={beatmap.diffName}
            className="bg-muted text-foreground shadow-none hover:bg-muted/70"
          />
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-9 bg-card shadow-none"
          >
            <Link
              data-testid="beatmap-external-link"
              href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View beatmap on osu!"
            >
              <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid border-t lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Activity className="size-3.5" aria-hidden="true" />
            <h2>Attributes</h2>
          </div>

          <dl className="mt-2.5 grid grid-cols-4 gap-1.5">
            <Attribute
              abbreviation="CS"
              label="Circle size"
              value={beatmap.cs}
            />
            <Attribute
              abbreviation="AR"
              label="Approach rate"
              value={beatmap.ar}
            />
            <Attribute
              abbreviation="OD"
              label="Overall difficulty"
              value={beatmap.od}
            />
            <Attribute abbreviation="HP" label="HP drain" value={beatmap.hp} />
          </dl>
        </section>

        <section className="min-w-0 border-t bg-muted/20 p-3.5 sm:p-4 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Trophy className="size-3.5" aria-hidden="true" />
            <h2>Tournament evidence</h2>
          </div>

          <dl
            data-testid="beatmap-stats-card"
            className="mt-2.5 grid grid-cols-2 gap-2 lg:grid-cols-4"
          >
            <EvidenceMetric
              icon={<Library aria-hidden="true" />}
              label="Pool records"
              value={summary.totalTournamentCount}
              testId="beatmap-pool-records"
              showArrow
            />
            <EvidenceMetric
              icon={<BadgeCheck aria-hidden="true" />}
              label="Verified pools"
              value={verifiedPoolCount}
              testId="beatmap-verified-pools"
              showArrow
            />
            <EvidenceMetric
              icon={<Trophy aria-hidden="true" />}
              label="Played"
              value={summary.verifiedPlayedTournamentCount}
              testId="beatmap-played-tournaments"
              showArrow
            />
            <EvidenceMetric
              icon={<Gamepad2 aria-hidden="true" />}
              label="Verified games"
              value={summary.totalGameCount}
              testId="beatmap-verified-games"
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Attribute({
  abbreviation,
  label,
  value,
}: {
  abbreviation: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-muted/60 px-2.5 py-2">
      <dt className="text-[10px] font-semibold text-muted-foreground uppercase">
        <abbr title={label} className="cursor-help no-underline">
          <span aria-hidden="true">{abbreviation}</span>
          <span className="sr-only">{label}</span>
        </abbr>
      </dt>
      <dd className="font-mono text-base font-semibold tabular-nums">
        {value.toFixed(1)}
      </dd>
    </div>
  );
}

function EvidenceMetric({
  icon,
  label,
  value,
  testId,
  showArrow = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  testId: string;
  showArrow?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className="relative flex min-w-0 items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-2.5"
    >
      <span className="shrink-0 text-muted-foreground [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="font-mono text-base font-semibold tabular-nums">
          {value.toLocaleString()}
        </dd>
      </div>
      {showArrow && (
        <ChevronRight
          className="absolute -right-2.5 z-10 hidden size-4 rounded-full bg-card text-muted-foreground lg:block"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
