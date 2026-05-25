'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { ScoringTypeEnumHelper, TeamTypeEnumHelper } from '@/lib/enum-helpers';
import { Game } from '@/lib/orpc/schema/match';
import { GameReportableFields } from '@/lib/orpc/schema/report';
import {
  AdminNoteRouteTarget,
  AuditEntityType,
  ReportEntityType,
} from '@otr/core/osu';
import AuditButton from '../audit/AuditButton';
import BeatmapBackground from './BeatmapBackground';
import FormattedDate from '../dates/FormattedDate';
import ModIconset from '../icons/ModIconset';
import RulesetIcon from '../icons/RulesetIcon';
import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import ReportButton from '../reports/ReportButton';
import GameAdminView from './GameAdminView';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';

export default function GameCardHeader({ game }: { game: Game }) {
  const startTime = game.startTime ? new Date(game.startTime) : null;
  const endTime = game.endTime ? new Date(game.endTime) : null;
  const isDeletedBeatmap =
    !game.beatmap || !game.beatmap.beatmapset || game.beatmap.osuId === 0;

  return (
    <div className="relative flex h-32 flex-col overflow-hidden rounded-xl">
      {/* Beatmap bg */}
      <BeatmapBackground
        beatmapsetId={game.beatmap?.beatmapset?.osuId}
        alt="beatmap cover"
      />

      {/* Enhanced overlay for better text contrast */}
      <div className="z-2 absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />

      {/* Game / beatmap info */}
      <div className="z-3 flex h-full w-full flex-col p-2 text-white">
        {/* Top row */}
        <div className="flex h-8 w-full items-center justify-between gap-2">
          <div className="flex h-full flex-row items-center gap-2 overflow-hidden sm:gap-4">
            <VerificationBadge
              verificationStatus={game.verificationStatus}
              warningFlags={game.warningFlags}
              rejectionReason={game.rejectionReason}
              entityType="game"
              size="small"
            />
            <RulesetIcon
              className="h-full w-fit min-w-6 fill-white stroke-0 py-1"
              ruleset={game.ruleset}
            />
            <span className="truncate text-sm font-medium text-white/90 sm:text-base">
              {ScoringTypeEnumHelper.getMetadata(game.scoringType).text}
            </span>
            <span className="hidden truncate text-sm font-medium text-white/90 sm:inline sm:text-base">
              {TeamTypeEnumHelper.getMetadata(game.teamType).text}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="flex gap-1 text-xs text-white/80 sm:text-sm">
              {startTime ? (
                <FormattedDate date={startTime} format="short" />
              ) : (
                'Unknown'
              )}
              <span aria-hidden="true">-</span>
              {endTime ? (
                <FormattedDate date={endTime} format="short" />
              ) : (
                'Unknown'
              )}
            </span>
            <SimpleTooltip content="View beatmap on osu!">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/20 hover:text-white"
              >
                <Link
                  href={`https://osu.ppy.sh/b/${game.beatmap?.osuId ?? 0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View beatmap on osu! website"
                >
                  <ExternalLink className="h-3 w-3 text-white/70 hover:text-white" />
                </Link>
              </Button>
            </SimpleTooltip>
            <ReportButton
              entityType={ReportEntityType.Game}
              entityId={game.id}
              entityDisplayName={
                game.beatmap?.beatmapset?.title
                  ? `${game.beatmap.beatmapset.title} [${game.beatmap.diffName}]`
                  : `Game ${game.id}`
              }
              reportableFields={GameReportableFields}
              currentValues={{
                ruleset: String(game.ruleset),
                scoringType: String(game.scoringType),
                teamType: String(game.teamType),
                mods: String(game.mods),
                startTime: game.startTime ?? '',
                endTime: game.endTime ?? '',
              }}
              darkMode={true}
            />
            <AuditButton
              entityType={AuditEntityType.Game}
              entityId={game.id}
              darkMode={true}
            />
            <AdminNoteView
              notes={game.adminNotes}
              entity={AdminNoteRouteTarget.Game}
              entityId={game.id}
              darkMode={true}
            />
            <GameAdminView game={game} />
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex w-full flex-1 flex-row justify-between gap-2">
          <div className="max-w-3/4 flex flex-1 flex-col justify-end overflow-hidden">
            <span className="flex gap-1 truncate text-xs text-white/80 sm:text-sm">
              <span>Set by</span>
              {isDeletedBeatmap || !game.beatmap?.beatmapset?.creator ? (
                <span className="font-semibold text-white">Unknown user</span>
              ) : (
                <Link
                  href={`/players/${game.beatmap.beatmapset.creator.id}`}
                  className="font-semibold text-white"
                >
                  {game.beatmap.beatmapset.creator.username}
                </Link>
              )}
              <span>• Map by</span>
              {isDeletedBeatmap || !game.beatmap?.creators?.length ? (
                <span className="font-semibold text-white">
                  Unknown creator
                </span>
              ) : (
                <span className="font-semibold text-white">
                  {game.beatmap.creators.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link href={`/players/${c.id}`} className="">
                        {c.username}
                      </Link>
                    </span>
                  ))}
                </span>
              )}
            </span>
            {isDeletedBeatmap ? (
              <span className="truncate text-sm font-bold text-white drop-shadow-sm sm:text-xl">
                Deleted beatmap
              </span>
            ) : (
              <Link
                href={`/beatmaps/${game.beatmap?.osuId}`}
                className="truncate text-sm font-bold text-white drop-shadow-sm sm:text-xl"
              >
                {game.beatmap?.beatmapset?.title ?? 'Deleted beatmap'} [
                {game.beatmap?.diffName ?? 'Unknown'}]
              </Link>
            )}
          </div>
          <ModIconset
            mods={game.mods}
            freemod={game.isFreeMod}
            className="min-w-1/8 flex flex-row items-end justify-end"
            iconClassName="max-h-8 sm:max-h-12"
          />
        </div>
      </div>
    </div>
  );
}
