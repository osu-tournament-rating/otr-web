'use client';

import Link from 'next/link';
import { useContext } from 'react';
import { Gamepad2, Music, Star } from 'lucide-react';

import { RulesetEnumHelper } from '@/lib/enums';
import type { BeatmapSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';
import RulesetIcon from '../icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { Card } from '../ui/card';
import { SearchDialogContext } from './SearchDialog';
import BeatmapBackground from '../games/BeatmapBackground';

export default function BeatmapSearchResultCard({
  data,
}: {
  data: BeatmapSearchResult;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  const displayTitle = `${data.artist} - ${data.title}`;

  return (
    <Card className="border-none bg-popover p-0 transition-colors hover:bg-popover/80">
      <Link
        href={`/beatmaps/${data.osuId}`}
        onClick={closeDialog}
        className="flex gap-3 overflow-hidden p-3 sm:p-4"
      >
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded sm:h-14 sm:w-14">
          <BeatmapBackground
            beatmapsetId={data.beatmapsetOsuId ?? undefined}
            alt={`${displayTitle} cover`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <Music className="text-muted-foreground h-4 w-4 flex-shrink-0" />
            <p className="min-w-0 truncate text-sm font-medium sm:text-base">
              {highlightMatch(displayTitle, query)}
            </p>
          </div>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            [{highlightMatch(data.diffName, query)}]
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end justify-center gap-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="text-primary h-3.5 w-3.5" />
              <span className="text-xs font-medium">{data.sr.toFixed(2)}</span>
            </div>
            <SimpleTooltip
              content={RulesetEnumHelper.getMetadata(data.ruleset).text}
            >
              <RulesetIcon
                ruleset={data.ruleset}
                width={16}
                height={16}
                className="fill-primary flex-shrink-0"
              />
            </SimpleTooltip>
          </div>
          {data.gameCount > 0 && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Gamepad2 className="h-3 w-3" />
              <span>{data.gameCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </Link>
    </Card>
  );
}
