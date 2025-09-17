import { ScoringTypeEnumHelper, TeamTypeEnumHelper } from '@/lib/enums';
import {
  AdminNoteRouteTarget,
  GameDTO,
} from '@osu-tournament-rating/otr-api-client';
import Link from 'next/link';
import BeatmapBackground from './BeatmapBackground';
import { ExternalLink } from 'lucide-react';
import RulesetIcon from '../icons/RulesetIcon';
import ModIconset from '../icons/ModIconset';
import FormattedDate from '../dates/FormattedDate';
import GameAdminView from './GameAdminView';
import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';

export default function GameCardHeader({ game }: { game: GameDTO }) {
  return (
    <div className="relative flex h-32 flex-col overflow-hidden rounded-xl">
      {/* Beatmap bg */}
      <BeatmapBackground
        beatmapsetId={game.beatmap?.beatmapset?.osuId}
        alt="beatmap cover"
      />

      {/* Enhanced overlay for better text contrast */}
      <div className="absolute inset-0 z-2 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />

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
              <FormattedDate date={new Date(game.startTime)} format="short" />
              -
              <FormattedDate
                date={new Date(game.endTime ?? new Date())}
                format="short"
              />
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
            <AdminNoteView
              notes={game.adminNotes}
              entity={AdminNoteRouteTarget.Game}
              entityId={game.id}
            />
            <GameAdminView game={game} />
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex w-full flex-1 flex-row justify-between gap-2">
          <div className="flex max-w-3/4 flex-1 flex-col justify-end overflow-hidden">
            <span className="flex gap-1 truncate text-xs text-white/80 sm:text-sm">
              <span>Set by</span>
              <span className="font-semibold text-white">
                {game.beatmap?.beatmapset?.creator?.username}
              </span>
              <span>• Map by</span>
              <span className="font-semibold text-white">
                {game.beatmap?.creators.map((c) => c.username).join(', ')}
              </span>
            </span>
            <span className="truncate text-sm font-bold text-white drop-shadow-sm sm:text-xl">
              {game.beatmap?.beatmapset?.title} [{game.beatmap?.diffName}]
            </span>
          </div>
          <ModIconset
            mods={game.mods}
            freemod={game.isFreeMod}
            className="flex min-w-1/8 flex-row items-end justify-end"
            iconClassName="max-h-8 sm:max-h-12"
          />
        </div>
      </div>
    </div>
  );
}
