import Link from 'next/link';
import { TournamentSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import RulesetIcon from '../icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { RulesetEnumHelper } from '@/lib/enums';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';
import { Card } from '../ui/card';
import { Trophy, Users } from 'lucide-react';

export default function TournamentSearchResult({
  data,
}: {
  data: TournamentSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <Card className="border-none bg-popover p-3 transition-colors hover:bg-popover/80 sm:p-4">
      <Link
        href={`/tournaments/${data.id}`}
        onClick={closeDialog}
        className="flex flex-col gap-2 overflow-hidden sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 sm:h-10 sm:w-10">
            <Trophy className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <p className="min-w-0 text-base font-medium sm:text-lg">
            {highlightMatch(data.name, query)}
          </p>
        </div>

        <div className="ml-10 flex flex-shrink items-center gap-3 sm:ml-0 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Users className="h-4 w-4 flex-shrink-0 text-primary sm:h-4 sm:w-4" />
            <span className="text-xs font-medium sm:text-sm">
              {data.lobbySize}v{data.lobbySize}
            </span>
          </div>

          <SimpleTooltip
            content={RulesetEnumHelper.getMetadata(data.ruleset).text}
          >
            <RulesetIcon
              ruleset={data.ruleset}
              width={20}
              height={20}
              className="flex-shrink-0 fill-primary sm:h-5 sm:w-5"
            />
          </SimpleTooltip>
        </div>
      </Link>
    </Card>
  );
}
