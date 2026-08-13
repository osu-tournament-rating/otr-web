import { Activity, Clock3, Gamepad2, Trophy } from 'lucide-react';
import Link from 'next/link';

import BeatmapIdentity from '@/components/beatmaps/BeatmapIdentity';
import BeatmapMetric from '@/components/beatmaps/BeatmapMetric';
import RulesetPill from '@/components/beatmaps/RulesetPill';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import { Card } from '@/components/ui/card';
import { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';
import { formatDuration } from '@/lib/utils/date';

interface PlayerBeatmapCardProps {
  beatmap: PlayerBeatmapStats;
}

export default function PlayerBeatmapCard({ beatmap }: PlayerBeatmapCardProps) {
  const bpm = Math.round(beatmap.bpm);
  const duration = formatDuration(beatmap.totalLength);

  return (
    <Card
      data-testid={`player-beatmap-card-${beatmap.osuId}`}
      className="group relative gap-0 overflow-hidden p-3 font-sans transition-colors hover:border-primary/35 sm:p-4 dark:hover:bg-secondary/40"
    >
      <Link
        href={`/beatmaps/${beatmap.osuId}`}
        prefetch={false}
        aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <BeatmapIdentity
          osuId={beatmap.osuId}
          beatmapsetOsuId={beatmap.beatmapsetId}
          artist={beatmap.artist}
          title={beatmap.title}
          diffName={beatmap.diffName}
          size="row"
          coverSizes="(max-width: 639px) calc(100vw - 4rem), (max-width: 1023px) 192px, (max-width: 1279px) 208px, 224px"
          showMapper={false}
          className="min-w-0 flex-1"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 rounded-t-lg bg-gradient-to-b from-black/55 to-transparent"
          />
          <RulesetPill
            ruleset={beatmap.ruleset}
            diffName={beatmap.diffName}
            tone="overlay"
            className="pointer-events-none absolute top-2 left-2 z-20"
          />
          <StarRatingPill
            starRating={beatmap.sr}
            testId="player-beatmap-star-rating"
            className="pointer-events-none absolute top-2 right-2 z-20"
          />
        </BeatmapIdentity>

        {/* Minimum widths keep the four metrics in columns down the list. */}
        <div
          data-testid="player-beatmap-metrics"
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:shrink-0 sm:text-sm"
        >
          <BeatmapMetric
            className="min-w-14"
            testId="player-beatmap-bpm"
            icon={<Activity className="size-4 shrink-0" aria-hidden="true" />}
            value={bpm}
            ariaLabel={`${bpm} BPM`}
          />
          <BeatmapMetric
            className="min-w-17"
            testId="player-beatmap-duration"
            icon={<Clock3 className="size-4 shrink-0" aria-hidden="true" />}
            value={duration}
            ariaLabel={`${duration} duration`}
          />
          <BeatmapMetric
            testId="player-beatmap-games-count"
            icon={<Gamepad2 className="size-4 shrink-0" aria-hidden="true" />}
            value={beatmap.gameCount.toLocaleString()}
            valueClassName="min-w-[3ch]"
            ariaLabel={`${beatmap.gameCount.toLocaleString()} verified games`}
          />
          <BeatmapMetric
            testId="player-beatmap-tournaments-count"
            icon={<Trophy className="size-4 shrink-0" aria-hidden="true" />}
            value={beatmap.tournamentCount.toLocaleString()}
            valueClassName="min-w-[3ch]"
            ariaLabel={`${beatmap.tournamentCount.toLocaleString()} tournaments`}
          />
        </div>
      </div>
    </Card>
  );
}
