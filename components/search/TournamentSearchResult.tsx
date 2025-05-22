import Link from 'next/link';
import { TournamentSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import RulesetIcon from '../icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { RulesetEnumHelper } from '@/lib/enums';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';

export default function TournamentSearchResult({
  data,
}: {
  data: TournamentSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <div className="bg-accent flex items-center justify-between rounded-xl p-3">
      <div className="flex flex-1 items-center gap-2">
        <Link href={`/tournaments/${data.id}`} onClick={closeDialog}>
          <p className="text-lg font-medium">
            {highlightMatch(data.name, query)}
          </p>
        </Link>
      </div>
      <div className="text-accent-foreground flex items-center gap-5">
        <p className="font-medium">
          {data.lobbySize}v{data.lobbySize}
        </p>
        <SimpleTooltip
          content={RulesetEnumHelper.getMetadata(data.ruleset).text}
        >
          <RulesetIcon
            ruleset={data.ruleset}
            width={24}
            height={24}
            className="fill-primary flex-shrink-0"
          />
        </SimpleTooltip>
      </div>
    </div>
  );
}
