import { ScoringTypeEnumHelper, TeamTypeEnumHelper } from '@/lib/enums';
import {
  AdminNoteRouteTarget,
  GameDTO,
} from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import RulesetIcon from '../icons/RulesetIcon';
import ModIconset from '../icons/ModIconset';
import FormattedDate from '../dates/FormattedDate';
import GameAdminView from './GameAdminView';
import AdminNoteView from '../admin-notes/AdminNoteView';

export default function GameCardHeader({ game }: { game: GameDTO }) {
  return (
    <div className="relative flex h-32 flex-col overflow-hidden rounded-xl">
      {/* Beatmap bg dim */}
      <div className="bg:black z-2 absolute inset-0 h-full w-full bg-black/20 dark:bg-black/50" />
      {/* Beatmap bg */}
      <Image
        className="z-1 absolute rounded-xl object-cover"
        src={`https://assets.ppy.sh/beatmaps/${game.beatmap.beatmapset?.osuId}/covers/cover@2x.jpg`}
        alt={'beatmap cover'}
        fill
      />
      {/* Game / beatmap info */}
      <div className="z-2 flex h-full w-full flex-col p-2 text-slate-50 dark:text-slate-300">
        {/* Top row */}
        <div className="flex h-8 w-full items-center justify-between gap-2">
          <div className="flex h-full flex-row items-center gap-2 overflow-hidden sm:gap-4">
            <RulesetIcon
              className="fill-foreground h-full w-fit min-w-6 stroke-0 py-1"
              ruleset={game.ruleset}
            />
            <span className="truncate text-sm sm:text-base">
              {ScoringTypeEnumHelper.getMetadata(game.scoringType).text}
            </span>
            <span className="hidden truncate text-sm sm:inline sm:text-base">
              {TeamTypeEnumHelper.getMetadata(game.teamType).text}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="flex gap-1 text-xs sm:text-sm">
              <FormattedDate date={new Date(game.startTime)} format="short" />
              -
              <FormattedDate
                date={new Date(game.endTime ?? new Date())}
                format="short"
              />
            </span>
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
          <div className="max-w-3/4 flex flex-1 flex-col justify-end overflow-hidden">
            <span className="flex gap-1 truncate text-xs sm:text-sm">
              <span>Set by</span>
              <span className="font-semibold">
                {game.beatmap.beatmapset?.creator?.username}
              </span>
              <span>• Map by</span>
              <span className="font-semibold">
                {game.beatmap.creators.map((c) => c.username).join(',')}
              </span>
            </span>
            <span className="truncate text-sm font-bold sm:text-xl">
              {game.beatmap.beatmapset?.title} [{game.beatmap.diffName}]
            </span>
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
