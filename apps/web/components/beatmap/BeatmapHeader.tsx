'use client';

import { RulesetEnumHelper } from '@/lib/enums';
import Link from 'next/link';
import { Card } from '../ui/card';
import RulesetIcon from '../icons/RulesetIcon';
import { Music, Star, Timer, User } from 'lucide-react';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';
import BeatmapBackground from '../games/BeatmapBackground';
import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';

interface BeatmapHeaderProps {
  beatmap: BeatmapWithDetails;
}

export default function BeatmapHeader({ beatmap }: BeatmapHeaderProps) {
  const duration = formatSecondsToMinutesSeconds(beatmap.totalLength);

  return (
    <Card className="relative overflow-hidden p-0 font-sans">
      <BeatmapBackground
        beatmapsetId={beatmap.beatmapset?.osuId ?? undefined}
        alt={`Beatmap ${beatmap.osuId} background`}
      />

      <div className="absolute inset-0 z-[2] h-full w-full bg-gradient-to-b from-black/60 via-black/50 to-black/60" />

      <div className="relative z-[3] flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h1 className="text-lg font-semibold leading-tight text-white drop-shadow-sm sm:text-xl md:text-2xl">
                {beatmap.beatmapset?.artist ?? 'Unknown'} -{' '}
                {beatmap.beatmapset?.title ?? 'Unknown'}
              </h1>
              <div className="mt-1 text-sm text-white/80">
                [{beatmap.diffName}]
              </div>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5">
            <RulesetIcon
              ruleset={beatmap.ruleset}
              width={16}
              height={16}
              className="flex-shrink-0 fill-white"
            />
            <span className="truncate">
              {RulesetEnumHelper.getMetadata(beatmap.ruleset).text}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 flex-shrink-0" />
            <span>{beatmap.sr.toFixed(2)}★</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{duration}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Music className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{beatmap.bpm.toFixed(0)} BPM</span>
          </div>

          {beatmap.beatmapset?.creator && (
            <Link
              href={`/players/${beatmap.beatmapset.creator.id}`}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {beatmap.beatmapset.creator.username}
              </span>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-white/60">
          <span>CS {beatmap.cs.toFixed(1)}</span>
          <span>AR {beatmap.ar.toFixed(1)}</span>
          <span>OD {beatmap.od.toFixed(1)}</span>
          <span>HP {beatmap.hp.toFixed(1)}</span>
          {beatmap.maxCombo && <span>Max Combo: {beatmap.maxCombo}</span>}
        </div>
      </div>
    </Card>
  );
}
