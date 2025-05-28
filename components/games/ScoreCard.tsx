import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { ScoreGradeEnumHelper } from '@/lib/enums';
import Image from 'next/image';
import ModIconset from '../icons/ModIconset';
import { cn } from '@/lib/utils';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import ScoreTeamColorBar from './ScoreTeamColorBar';

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
      className="team-flex-row group relative flex overflow-clip rounded-xl border border-secondary-foreground/15 **:z-10"
    >
      {/* Background team color overlay */}
      <div className="absolute z-[2] size-full bg-[var(--team-color)]/10" />

      {/* Team color on the side of the card */}
      <ScoreTeamColorBar score={score} />

      {/* Content */}
      <div className="flex size-full flex-col gap-2 px-2">
        {/* Top row */}
        <div className="team-flex-row flex flex-1 items-center justify-between">
          {/* Player */}
          <div className="team-flex-row flex h-full w-fit items-center justify-start gap-2">
            <VerificationBadge
              verificationStatus={score.verificationStatus}
              rejectionReason={score.rejectionReason}
              entityType="score"
              size="small"
            />
            <span className="relative aspect-[70/50] h-1/2">
              <Image
                src={`https://osu.ppy.sh/images/flags/${player?.country}.png`}
                alt={`country ${player?.country}`}
                fill
              />
            </span>
            <Link href={`/players/${player?.id}`}>
              <span className="font-bold">{player?.username}</span>
            </Link>
          </div>
          {/* Grade / Mods / Score */}
          <div className="team-flex-row flex h-full items-center justify-center gap-2">
            <ModIconset
              className="team-flex-row flex h-full max-w-20 items-center justify-end"
              iconClassName={cn(
                'max-h-6',
                // Clear left margin
                'md:group-data-[team="Blue"]:not-first:ml-0 md:group-data-[team="Blue"]:peer-hover:not-first:ml-0 md:group-data-[team="Blue"]:hover:not-first:ml-0',
                // Add right margin
                'md:group-data-[team="Blue"]:not-first:-mr-4 md:group-data-[team="Blue"]:peer-hover:not-first:-mr-2 md:group-data-[team="Blue"]:hover:not-first:-mr-2'
              )}
              mods={score.mods}
            />
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
          <div className="team-flex-row flex items-center justify-start gap-4">
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
          <div className="team-flex-row flex items-center justify-end gap-4">
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
