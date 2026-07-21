import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import {
  Activity,
  Clock3,
  ExternalLink,
  Gamepad2,
  Gauge,
  Library,
  Star,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

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
}: {
  beatmap: BeatmapWithDetails;
  summary: BeatmapStatsSummary;
}) {
  const displayRuleset = getBeatmapDisplayRuleset(
    beatmap.ruleset,
    beatmap.diffName
  );
  const rulesetLabel = getBeatmapRulesetLabel(
    beatmap.ruleset,
    beatmap.diffName
  );
  const pooledCount = summary.totalTournamentCount;
  const pooledLabel = `Pooled ${pooledCount.toLocaleString()} ${pooledCount === 1 ? 'time' : 'times'}`;
  const gameLabel = summary.totalGameCount === 1 ? 'game' : 'games';
  const tournamentLabel =
    summary.verifiedPlayedTournamentCount === 1 ? 'tournament' : 'tournaments';

  return (
    <div
      data-testid="beatmap-data-glass"
      className="mt-5 overflow-hidden rounded-xl border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md"
    >
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <section
          aria-label="Beatmap essentials"
          className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5"
        >
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-sm font-medium text-white/85">
            <RulesetIcon
              ruleset={displayRuleset}
              className="size-4 fill-current"
              aria-hidden="true"
            />
            {rulesetLabel}
          </span>
          <span
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-current/20 px-2.5 text-sm font-bold"
            style={{
              backgroundColor: getStarRatingColor(beatmap.sr),
              color: getStarRatingForegroundColor(beatmap.sr),
            }}
            aria-label={`${beatmap.sr.toFixed(2)} star rating`}
          >
            <Star className="size-4 fill-current" aria-hidden="true" />
            {beatmap.sr.toFixed(2)} SR
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-sm font-semibold tabular-nums">
            <Activity className="size-4 text-white/65" aria-hidden="true" />
            {Math.round(beatmap.bpm)} BPM
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-sm font-semibold tabular-nums">
            <Clock3 className="size-4 text-white/65" aria-hidden="true" />
            {formatSecondsToMinutesSeconds(beatmap.totalLength)}
          </span>
        </section>

        <div className="flex shrink-0 items-center gap-2">
          <AudioPreviewButton
            beatmapsetOsuId={beatmap.beatmapset?.osuId}
            artist={beatmap.beatmapset?.artist}
            title={beatmap.beatmapset?.title}
            difficulty={beatmap.diffName}
            className="border border-white/15 bg-white text-black hover:bg-white/90"
          />
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="size-9 border border-white/15 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
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

      <div className="grid border-t border-white/15 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="min-w-0 p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/65 uppercase">
            <Gauge className="size-3.5" aria-hidden="true" />
            <h2>Attributes</h2>
          </div>

          <dl className="mt-2.5 flex flex-wrap items-center gap-2">
            <PrimaryAttribute
              abbreviation="CS"
              label="Circle size"
              value={beatmap.cs}
            />
            <PrimaryAttribute
              abbreviation="AR"
              label="Approach rate"
              value={beatmap.ar}
            />
            <SecondaryAttribute
              abbreviation="OD"
              label="Overall difficulty"
              value={beatmap.od}
            />
            <SecondaryAttribute
              abbreviation="HP"
              label="HP drain"
              value={beatmap.hp}
            />
          </dl>
        </section>

        <section className="min-w-0 border-t border-white/15 p-3.5 sm:p-4 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/65 uppercase">
            <Trophy className="size-3.5" aria-hidden="true" />
            <h2>Tournament usage</h2>
          </div>

          <dl
            data-testid="beatmap-stats-card"
            className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
          >
            <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3">
              <Gamepad2
                className="size-3.5 shrink-0 text-white/60"
                aria-hidden="true"
              />
              <dt className="sr-only">Tournament games</dt>
              <dd className="min-w-0 text-sm text-white/65">
                <strong className="text-base font-bold tracking-tight text-white tabular-nums">
                  {summary.totalGameCount.toLocaleString()}
                </strong>{' '}
                {gameLabel} across{' '}
                <strong className="text-base font-bold tracking-tight text-white tabular-nums">
                  {summary.verifiedPlayedTournamentCount.toLocaleString()}
                </strong>{' '}
                {tournamentLabel}
              </dd>
            </div>
            <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3">
              <Library
                className="size-3.5 shrink-0 text-white/60"
                aria-hidden="true"
              />
              <dt className="sr-only">Pool usage</dt>
              <dd className="truncate text-sm font-semibold tabular-nums">
                {pooledLabel}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function PrimaryAttribute({
  abbreviation,
  label,
  value,
}: {
  abbreviation: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-h-10 items-baseline gap-2 rounded-lg border border-primary/50 bg-primary/30 px-3 py-1.5 shadow-inner shadow-white/5">
      <dt className="text-xs font-semibold text-white/70 uppercase">
        <abbr title={label} className="cursor-help no-underline">
          <span aria-hidden="true">{abbreviation}</span>
          <span className="sr-only">{label}</span>
        </abbr>
      </dt>
      <dd className="font-mono text-lg font-bold tabular-nums">
        {value.toFixed(1)}
      </dd>
    </div>
  );
}

function SecondaryAttribute({
  abbreviation,
  label,
  value,
}: {
  abbreviation: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5">
      <dt className="text-[10px] font-medium text-white/55 uppercase">
        <abbr title={label} className="cursor-help no-underline">
          <span aria-hidden="true">{abbreviation}</span>
          <span className="sr-only">{label}</span>
        </abbr>
      </dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">
        {value.toFixed(1)}
      </dd>
    </div>
  );
}
