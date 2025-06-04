import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { ScoreGradeEnumHelper } from '@/lib/enums';
import ModIconset from '../icons/ModIconset';
import { cn } from '@/lib/utils';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import ScoreTeamColorBar from './ScoreTeamColorBar';
import CountryFlag from '../shared/CountryFlag';

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
      className="team-flex-row group relative flex overflow-clip rounded-xl border border-neutral-300 bg-white **:z-10 dark:border-neutral-700 dark:bg-neutral-800"
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
            {player?.country && (
              <CountryFlag
                country={player.country}
                width={20}
                height={14}
                showTooltip={false}
                className="flex-shrink-0"
              />
            )}
            <Link href={`/players/${player?.id}?ruleset=${score.ruleset}`}>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {player?.username}
              </span>
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
            <span className="text-neutral-800 dark:text-neutral-200">
              {ScoreGradeEnumHelper.getMetadata(score.grade).text}
            </span>
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
          <div className="flex flex-row items-center justify-start gap-4">
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                {300}
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.count300}x
              </span>
            </div>
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                {100}
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.count100}x
              </span>
            </div>
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                {50}
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.count50}x
              </span>
            </div>
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                Miss
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.countMiss}x
              </span>
            </div>
          </div>
          {/* Acc / Combo */}
          <div className="flex flex-row items-center justify-end gap-4">
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                Combo
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.maxCombo}x
              </span>
            </div>
            <div className="performance-item">
              <span className="label text-neutral-600 dark:text-neutral-400">
                Accuracy
              </span>
              <span className="value text-neutral-800 dark:text-neutral-200">
                {score.accuracy.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
