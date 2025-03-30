import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { ScoreGradeEnumHelper } from '@/lib/enums';
import Image from 'next/image';
import ModIconset from '../icons/ModIconset';
import { cn } from '@/lib/utils';

export default function ScoreCard({
  score,
  player,
  won = false,
}: {
  score: GameScoreDTO;
  player?: PlayerCompactDTO;
  won?: boolean;
}) {
  return (
    <div
      data-team={Team[score.team]}
      className="team-flex-row relative flex overflow-clip rounded-xl border border-secondary-foreground/15 font-sans **:z-10"
    >
      {/* Player propic bg */}
      <div className="player-propic absolute top-1/2 z-[1] aspect-square w-3/5 transform-[translateY(-50%)_scale(1)]">
        <Image
          src={`https://s.ppy.sh/a/${player?.osuId}`}
          alt={`${player?.username} profile picture`}
          fill
        />
      </div>

      {/* Team color overlay */}
      <div className="absolute z-[2] size-full bg-[var(--team-color)]/10" />
      <div className="h-full w-1.5 bg-[var(--team-color)]/70" />

      {/* Content */}
      <div className="flex size-full flex-col px-2">
        {/* Top row */}
        <div className="team-flex-row flex flex-1 items-center justify-between">
          {/* Player */}
          <div className="team-flex-row flex h-full w-fit items-center justify-start gap-2">
            <span className="relative aspect-[70/50] h-1/2">
              <Image
                src={`https://osu.ppy.sh/images/flags/${player?.country}.png`}
                alt={`country ${player?.country}`}
                fill
              />
            </span>
            <span className="font-bold">{player?.username}</span>
          </div>
          {/* Grade / Mods / Score */}
          <div className="team-flex-row flex h-full items-center justify-center gap-2">
            <div className="flex h-full max-w-20 flex-row items-center justify-end">
              <ModIconset className="max-h-6" mods={score.mods} />
            </div>
            <span>{ScoreGradeEnumHelper.getMetadata(score.grade).text}</span>
            <span
              className={cn(
                'text-lg text-(--score-text-color)',
                won && 'font-bold'
              )}
            >
              {score.score.toLocaleString()}
            </span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="team-flex-row flex flex-1 items-center justify-between gap-6">
          {/* 300 / 100 / 50 / Miss */}
          <div className="performance-group team-flex-row flex items-center justify-start gap-4">
            <div className="performance-item">
              <span className="label">{300}</span>
              <span className="value">{score.count300}x</span>
            </div>
            <div className="performance-item">
              <span className="label">{100}</span>
              <span className="value">{score.count100}x</span>
            </div>
            <div className="performance-item">
              <span className="label">{50}</span>
              <span className="value">{score.count50}x</span>
            </div>
            <div className="performance-item">
              <span className="label">Miss</span>
              <span className="value">{score.countMiss}x</span>
            </div>
          </div>
          {/* Acc / Combo */}
          <div className="performance-group team-flex-row flex items-center justify-end gap-4">
            <div className="performance-item">
              <span className="label">Combo</span>
              <span className="value">{score.maxCombo}x</span>
            </div>
            <div className="performance-item">
              <span className="label">Accuracy</span>
              <span className="value">{score.accuracy.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
