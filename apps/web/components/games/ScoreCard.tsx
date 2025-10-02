'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ScoreGradeEnumHelper } from '@/lib/enums';
import { GameScore, MatchPlayer } from '@/lib/orpc/schema/match';
import { AdminNoteRouteTarget, Roles, Ruleset, Team } from '@otr/core/osu';
import { useSession } from '@/lib/hooks/useSession';
import { cn } from '@/lib/utils';
import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import CountryFlag from '../shared/CountryFlag';
import ScoreAdminView from '../scores/ScoreAdminView';
import ModIconset from '../icons/ModIconset';
import ScoreTeamColorBar from './ScoreTeamColorBar';

export default function ScoreCard({
  score,
  player,
  won = false,
}: {
  score: GameScore;
  player?: MatchPlayer;
  won?: boolean;
}) {
  const session = useSession();
  const isAdmin = session?.scopes?.includes(Roles.Admin);
  const hasNotes = score.adminNotes && score.adminNotes.length > 0;
  const showAdminControls = isAdmin || hasNotes;

  const hitJudgments = (() => {
    switch (score.ruleset) {
      case Ruleset.Taiko:
        return [
          { label: '300', value: `${score.count300}x` },
          { label: '150', value: `${score.count100}x` },
          { label: 'Miss', value: `${score.countMiss}x` },
        ];
      case Ruleset.Mania4k:
      case Ruleset.Mania7k:
      case Ruleset.ManiaOther:
        return [
          { label: '320', value: `${score.countGeki}x` },
          { label: '300', value: `${score.count300}x` },
          { label: '200', value: `${score.countKatu}x` },
          { label: '100', value: `${score.count100}x` },
          { label: '50', value: `${score.count50}x` },
          { label: 'Miss', value: `${score.countMiss}x` },
        ];
      case Ruleset.Catch:
        return [
          { label: '300', value: `${score.count300}x` },
          { label: '30', value: `${score.count100}x` },
          { label: '10', value: `${score.count50}x` },
          { label: 'Miss', value: `${score.countMiss}x` },
        ];
      case Ruleset.Osu:
      default:
        return [
          { label: '300', value: `${score.count300}x` },
          { label: '100', value: `${score.count100}x` },
          { label: '50', value: `${score.count50}x` },
          { label: 'Miss', value: `${score.countMiss}x` },
        ];
    }
  })();

  return (
    <div
      data-team={Team[score.team]}
      className="team-flex-row **:z-10 group relative flex overflow-clip rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800"
    >
      {/* Background team color overlay */}
      <div className="bg-[var(--team-color)]/10 absolute z-[2] size-full" />

      {/* Team color on the side of the card */}
      <ScoreTeamColorBar />

      {/* Content */}
      <div className="flex size-full flex-col gap-2 px-2">
        {/* Top row */}
        <div className="team-flex-row flex flex-1 items-center justify-between">
          {/* Player */}
          <div className="team-flex-row flex h-full min-w-0 items-center justify-start gap-2">
            <VerificationBadge
              verificationStatus={score.verificationStatus}
              rejectionReason={score.rejectionReason}
              entityType="score"
              size="small"
            />
            {showAdminControls && (
              <div className="relative flex items-center gap-0.5">
                <div className="relative [&_button]:h-4 [&_button]:w-4 [&_button]:bg-transparent [&_button]:hover:bg-neutral-200 [&_button]:dark:hover:bg-neutral-700 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-neutral-600 [&_svg]:dark:text-neutral-400">
                  <AdminNoteView
                    notes={score.adminNotes}
                    entity={AdminNoteRouteTarget.GameScore}
                    entityId={score.id}
                  />
                </div>
                {isAdmin && (
                  <div className="relative [&_button]:h-4 [&_button]:w-4 [&_button]:bg-transparent [&_button]:hover:bg-neutral-200 [&_button]:dark:hover:bg-neutral-700 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-neutral-600 [&_svg]:dark:text-neutral-400">
                    <ScoreAdminView score={score} />
                  </div>
                )}
              </div>
            )}
            {player?.country && (
              <CountryFlag
                country={player.country}
                width={20}
                height={14}
                showTooltip={false}
                className="flex-shrink-0"
              />
            )}
            <Link
              href={`/players/${player?.id}?ruleset=${score.ruleset}`}
              className="min-w-0 flex-shrink"
            >
              <span className="block truncate font-bold text-neutral-800 dark:text-neutral-200">
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
            <Image
              src={`/icons/grades/${ScoreGradeEnumHelper.getMetadata(score.grade).text}.svg`}
              alt={`Grade ${ScoreGradeEnumHelper.getMetadata(score.grade).text}`}
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span
              className={cn(
                'text-(--score-text-color) text-lg',
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
            {hitJudgments.map((item, index) => (
              <div key={index} className="performance-item">
                <span className="label text-neutral-600 dark:text-neutral-400">
                  {item.label}
                </span>
                <span className="value text-neutral-800 dark:text-neutral-200">
                  {item.value}
                </span>
              </div>
            ))}
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
