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
    <Card className="border-none bg-popover p-4 transition-colors hover:bg-popover/80">
      <Link
        href={`/tournaments/${data.id}`}
        onClick={closeDialog}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <p className="text-lg font-medium">
            {highlightMatch(data.name, query)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
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
              className="flex-shrink-0 fill-primary"
            />
          </SimpleTooltip>
        </div>
      </Link>
    </Card>
  );
}
