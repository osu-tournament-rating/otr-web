'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';

import { ScoreGradeEnumHelper } from '@/lib/enums';
import { GameScore, MatchPlayer } from '@/lib/orpc/schema/match';
import { ScoreReportableFields } from '@/lib/orpc/schema/report';
import {
  AdminNoteRouteTarget,
  ReportEntityType,
  Roles,
  Ruleset,
  Team,
} from '@otr/core/osu';
import { useSession } from '@/lib/hooks/useSession';
import { cn } from '@/lib/utils';
import { formatAccuracy } from '@/lib/utils/format';
import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import ReportButton from '../reports/ReportButton';
import SimpleTooltip from '../simple-tooltip';
import CountryFlag from '../shared/CountryFlag';
import ScoreAdminView from '../scores/ScoreAdminView';
import ModIconset from '../icons/ModIconset';
import ScoreTeamColorBar from './ScoreTeamColorBar';

export default function ScoreCard({
  score,
  player,
  won = false,
  highlighted = false,
}: {
  score: GameScore;
  player?: MatchPlayer;
  won?: boolean;
  highlighted?: boolean;
}) {
  const session = useSession();
  const isAdmin = session?.scopes?.includes(Roles.Admin);
  const hasNotes = score.adminNotes && score.adminNotes.length > 0;
  const showAdminControls = isAdmin || hasNotes;

  /** Shared descendant-selector overrides for icon button slots */
  const iconSlotStyles =
    'relative [&_button]:h-4 [&_button]:w-4 [&_button]:bg-transparent [&_button]:hover:bg-neutral-200 [&_button]:dark:hover:bg-neutral-700 [&_svg]:text-neutral-600 [&_svg]:dark:text-neutral-400';

  const hitJudgments = (() => {
    switch (score.ruleset) {
      case Ruleset.Taiko:
        return [
          { label: 'Great', value: `${score.statGreat ?? 0}x` },
          { label: 'Ok', value: `${score.statOk ?? 0}x` },
          { label: 'Miss', value: `${score.statMiss ?? 0}x` },
        ];
      case Ruleset.Mania4k:
      case Ruleset.Mania7k:
      case Ruleset.ManiaOther:
        return [
          { label: 'Perfect', value: `${score.statPerfect ?? 0}x` },
          { label: 'Great', value: `${score.statGreat ?? 0}x` },
          { label: 'Good', value: `${score.statGood ?? 0}x` },
          { label: 'Ok', value: `${score.statOk ?? 0}x` },
          { label: 'Meh', value: `${score.statMeh ?? 0}x` },
          { label: 'Miss', value: `${score.statMiss ?? 0}x` },
        ];
      case Ruleset.Catch:
        return [
          { label: 'Great', value: `${score.statGreat ?? 0}x` },
          { label: 'Lg. Drop', value: `${score.statLargeTickHit ?? 0}x` },
          { label: 'Sm. Drop Miss', value: `${score.statSmallTickMiss ?? 0}x` },
          { label: 'Miss', value: `${score.statMiss ?? 0}x` },
        ];
      case Ruleset.Osu:
      default:
        return [
          { label: 'Great', value: `${score.statGreat ?? 0}x` },
          { label: 'Ok', value: `${score.statOk ?? 0}x` },
          { label: 'Meh', value: `${score.statMeh ?? 0}x` },
          { label: 'Miss', value: `${score.statMiss ?? 0}x` },
        ];
    }
  })();

  const renderActionIcons = () => (
    <>
      <div className={iconSlotStyles}>
        <ReportButton
          entityType={ReportEntityType.Score}
          entityId={score.id}
          entityDisplayName={`${player?.username ?? 'Unknown'}'s score`}
          reportableFields={ScoreReportableFields}
          currentValues={{
            score: String(score.score),
            accuracy: String(score.accuracy),
            maxCombo: String(score.maxCombo),
            mods: String(score.mods),
            team: String(score.team),
          }}
        />
      </div>
      <div className={iconSlotStyles}>
        <SimpleTooltip content="View audit history">
          <Link
            href={`/audit/scores/${score.id}`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700"
            aria-label="View audit history"
          >
            <Clock className="size-4" />
          </Link>
        </SimpleTooltip>
      </div>
      {showAdminControls && (
        <>
          <div className={iconSlotStyles}>
            <AdminNoteView
              notes={score.adminNotes}
              entity={AdminNoteRouteTarget.GameScore}
              entityId={score.id}
            />
          </div>
          {isAdmin && (
            <div className={iconSlotStyles}>
              <ScoreAdminView score={score} />
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div
      id={`score-${score.id}`}
      data-team={Team[score.team]}
      className={cn(
        'team-flex-row **:z-10 group relative flex overflow-clip rounded-xl border border-neutral-300 bg-white transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-800',
        highlighted && 'ring-2 ring-yellow-400 ring-offset-2'
      )}
    >
      {/* Background team color overlay */}
      <div className="bg-[var(--team-color)]/10 absolute z-[2] size-full" />

      {/* Team color on the side of the card */}
      <ScoreTeamColorBar />

      {/* XS compact layout */}
      <div className="flex size-full flex-col gap-1 px-2 py-1 sm:hidden">
        {/* Row 1: Player + Score */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <VerificationBadge
              verificationStatus={score.verificationStatus}
              rejectionReason={score.rejectionReason}
              entityType="score"
              size="small"
            />
            {player?.country && (
              <CountryFlag
                country={player.country}
                width={18}
                height={13}
                showTooltip={false}
                className="shrink-0"
              />
            )}
            <Link
              href={`/players/${player?.id}?ruleset=${score.ruleset}`}
              className="min-w-0 shrink"
            >
              <span className="block truncate font-bold text-neutral-800 dark:text-neutral-200">
                {player?.username}
              </span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ModIconset
              className="flex h-full max-w-14 items-center justify-end"
              iconClassName="max-h-5"
              mods={score.mods}
            />
            <Image
              src={`/icons/grades/${ScoreGradeEnumHelper.getMetadata(score.grade).text}.svg`}
              alt={`Grade ${ScoreGradeEnumHelper.getMetadata(score.grade).text}`}
              width={24}
              height={24}
              className="h-5 w-5"
            />
            <span
              className={cn(
                'text-(--score-text-color) tabular-nums',
                won && 'font-bold'
              )}
            >
              {score.score.toLocaleString()}
            </span>
          </div>
        </div>
        {/* Row 2: Compact stats + Action icons */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
            title={hitJudgments
              .map((j) => `${j.label}: ${j.value}`)
              .join(', ')}
          >
            {hitJudgments.map((j) => j.value.slice(0, -1)).join('/')}
            {' · '}
            {score.maxCombo}x{' · '}
            {formatAccuracy(score.accuracy)}
          </span>
          <div className="flex items-center gap-1">
            {renderActionIcons()}
          </div>
        </div>
      </div>

      {/* sm+ standard layout (matches original) */}
      <div className="hidden size-full flex-col gap-2 px-2 sm:flex">
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
            <div className="flex items-center gap-1">
              {renderActionIcons()}
            </div>
            {player?.country && (
              <CountryFlag
                country={player.country}
                width={20}
                height={14}
                showTooltip={false}
                className="shrink-0"
              />
            )}
            <Link
              href={`/players/${player?.id}?ruleset=${score.ruleset}`}
              className="min-w-0 shrink"
            >
              <span className="block truncate font-bold text-neutral-800 dark:text-neutral-200">
                {player?.username}
              </span>
            </Link>
          </div>
          {/* Grade / Mods / Score */}
          <div className="team-flex-row flex h-full items-center justify-center gap-2">
            <ModIconset
              className="flex h-full max-w-20 items-center justify-end"
              iconClassName="max-h-6"
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
          <div className="flex items-center justify-start gap-4">
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
          <div className="team-flex-row flex items-center justify-start gap-4">
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
                {formatAccuracy(score.accuracy)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
