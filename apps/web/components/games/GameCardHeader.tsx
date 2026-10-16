'use client';

import Link from 'next/link';

import ModIconset from '@/components/icons/ModIconset';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { TimeRangeText } from '@/components/kit/format/TimeRangeText';
import { VerificationStatusIcon } from '@/components/kit/status/VerificationStatusIcon';
import TapTooltip from '@/components/tap-tooltip';
import {
  SCORING_TYPE_LABELS,
  TEAM_TYPE_LABELS,
} from '@/lib/kit/format/enum-labels';
import { formatId } from '@/lib/kit/format/number';
import { getRulesetFullName } from '@/lib/kit/format/ruleset';
import {
  getRejectionReasonTexts,
  getWarningTexts,
} from '@/lib/kit/status/reasons';
import type { Game } from '@/lib/orpc/schema/match';
import { resolveGameDisplayMods } from '@/lib/utils/mods';

import BeatmapBackground from './BeatmapBackground';
import GameActionsMenu from './GameActionsMenu';

/** A white link on the cover art, underlined on hover. */
const ON_ART_LINK =
  'rounded-sm underline-offset-2 transition-colors outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-white/40';

/**
 * The top of a game card: the beatmap's cover under a dark matte with the
 * game's status, ruleset, scoring and team type, times and actions menu,
 * then the beatmap's name, its creators and the game's mods.
 */
export default function GameCardHeader({
  game,
  number,
}: {
  game: Game;
  /** The game's place in the match, which names its status icon. */
  number: number;
}) {
  const isDeletedBeatmap =
    !game.beatmap || !game.beatmap.beatmapset || game.beatmap.osuId === 0;
  const headerMods = resolveGameDisplayMods(game, game.scores);
  const beatmapLabel = `${game.beatmap?.beatmapset?.title ?? 'Deleted beatmap'} [${game.beatmap?.diffName ?? 'Unknown'}]`;
  // Names the actions menu, the report and the notes, as the old buttons did.
  const gameName = game.beatmap?.beatmapset?.title
    ? beatmapLabel
    : `Game ${formatId(game.id)}`;
  const rulesetName = getRulesetFullName(game.ruleset);

  return (
    <div className="relative flex h-32 flex-col overflow-hidden rounded-xl">
      <BeatmapBackground
        beatmapsetId={game.beatmap?.beatmapset?.osuId}
        alt=""
      />

      <div className="absolute inset-0 z-2 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />

      <div className="dark z-3 flex h-full w-full flex-col p-2 text-white">
        <div className="flex h-8 w-full items-center justify-between gap-2">
          <div className="flex h-full min-w-0 flex-row items-center gap-2 overflow-hidden sm:gap-4">
            <VerificationStatusIcon
              status={game.verificationStatus}
              warnings={getWarningTexts('game', game.warningFlags)}
              rejectionReasons={getRejectionReasonTexts(
                'game',
                game.rejectionReason
              )}
              context={`Game ${number}`}
              tooltip="tap"
            />
            <TapTooltip
              content={rulesetName}
              side="top"
              triggerAriaLabel={rulesetName}
              triggerClassName="inline-flex h-full w-auto shrink-0"
            >
              <RulesetIcon
                aria-hidden="true"
                className="h-full w-fit min-w-6 fill-white stroke-0 py-1"
                ruleset={game.ruleset}
              />
            </TapTooltip>
            <span className="hidden truncate text-sm font-medium text-white/90 sm:inline sm:text-base">
              {SCORING_TYPE_LABELS[game.scoringType]}
            </span>
            <span className="hidden truncate text-sm font-medium text-white/90 sm:inline sm:text-base">
              {TEAM_TYPE_LABELS[game.teamType]}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <TimeRangeText
              start={game.startTime}
              end={game.endTime}
              seconds
              className="text-xs text-white/80 sm:text-sm"
            />
            <GameActionsMenu game={game} gameName={gameName} />
          </div>
        </div>
        <div className="flex w-full flex-1 flex-row justify-between gap-2">
          <div className="flex max-w-3/4 flex-1 flex-col justify-end overflow-hidden">
            <span className="flex gap-1 truncate text-xs text-white/80 sm:text-sm">
              <span>Set by</span>
              {isDeletedBeatmap || !game.beatmap?.beatmapset?.creator ? (
                <span className="font-semibold text-white">Unknown user</span>
              ) : (
                <Link
                  href={`/players/${game.beatmap.beatmapset.creator.id}`}
                  prefetch={false}
                  className={`font-semibold text-white ${ON_ART_LINK}`}
                >
                  {game.beatmap.beatmapset.creator.username}
                </Link>
              )}
              <span aria-hidden="true">•</span>
              <span>Map by</span>
              {isDeletedBeatmap || !game.beatmap?.creators?.length ? (
                <span className="font-semibold text-white">
                  Unknown creator
                </span>
              ) : (
                <span className="font-semibold text-white">
                  {game.beatmap.creators.map((creator, index) => (
                    <span key={creator.id}>
                      {index > 0 && ', '}
                      <Link
                        href={`/players/${creator.id}`}
                        prefetch={false}
                        className={ON_ART_LINK}
                      >
                        {creator.username}
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
                data-testid="beatmap-link"
                href={`/beatmaps/${game.beatmap?.osuId}`}
                prefetch={false}
                title={beatmapLabel}
                className={`truncate text-sm font-bold text-white drop-shadow-sm sm:text-xl ${ON_ART_LINK}`}
              >
                {beatmapLabel}
              </Link>
            )}
          </div>
          <ModIconset
            mods={headerMods.mods}
            freemod={headerMods.freemod}
            className="flex min-w-1/8 flex-row items-end justify-end"
            iconClassName="max-h-8 sm:max-h-12"
          />
        </div>
      </div>
    </div>
  );
}
