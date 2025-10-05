'use client';

import { RulesetEnumHelper } from '@/lib/enums';
import Link from 'next/link';
import { Card } from '../ui/card';
import RulesetIcon from '../icons/RulesetIcon';
import {
  Eye,
  EyeOff,
  Gamepad2,
  Music,
  Star,
  Timer,
  Trophy,
} from 'lucide-react';
import { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';
import BeatmapBackground from '../games/BeatmapBackground';
import { useState } from 'react';
import { Button } from '../ui/button';
import PlayerBeatmapTournamentTable from './PlayerBeatmapTournamentTable';
import { cn } from '@/lib/utils';
import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';

interface PlayerBeatmapCardProps {
  beatmap: PlayerBeatmapStats;
}

export default function PlayerBeatmapCard({ beatmap }: PlayerBeatmapCardProps) {
  const [showTournaments, setShowTournaments] = useState(false);
  const duration = formatSecondsToMinutesSeconds(beatmap.totalLength);

  const totalGamesPlayed = beatmap.tournaments.reduce(
    (sum, tournament) => sum + tournament.gamesPlayed,
    0
  );

  const cardContent = (
    <div className="relative overflow-hidden">
      <BeatmapBackground
        beatmapsetId={beatmap.beatmapsetId ?? undefined}
        alt={`Beatmap ${beatmap.osuId} background`}
        className={cn(showTournaments && 'rounded-b-none')}
      />

      {/* Gradient overlay for better text contrast */}
      <div className="absolute inset-0 z-[2] h-full w-full bg-gradient-to-b from-black/60 via-black/50 to-black/60" />

      <div className="relative z-[3] flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex w-full gap-2 sm:w-auto">
            <Link href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}>
              <h2 className="text-lg font-semibold leading-tight text-white drop-shadow-sm sm:text-xl md:text-2xl">
                {beatmap.artist} - {beatmap.title}
              </h2>
              <div className="mt-1 text-sm text-white/80">
                [{beatmap.diffName}]
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/90">
            <div className="flex items-center gap-1.5">
              <span>{beatmap.tournamentCount}</span>
              <Trophy className="h-4 w-4 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>{totalGamesPlayed}</span>
              <Gamepad2 className="h-4 w-4 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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
          </div>

          <Button
            onClick={() => setShowTournaments(!showTournaments)}
            variant="outline"
            className={cn(
              '-my-1 h-8 gap-2 px-3 text-sm',
              'hover:bg-accent hover:text-accent-foreground',
              'border-input text-foreground border',
              showTournaments && 'bg-accent text-accent-foreground'
            )}
          >
            {showTournaments ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Tournaments
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <Card
        className={cn(
          'relative overflow-hidden p-0 font-sans',
          showTournaments && 'rounded-b-none'
        )}
      >
        {cardContent}
      </Card>
      {showTournaments && (
        <Card className="rounded-t-none border-t-0 p-4 sm:p-6">
          <PlayerBeatmapTournamentTable tournaments={beatmap.tournaments} />
        </Card>
      )}
    </div>
  );
}
