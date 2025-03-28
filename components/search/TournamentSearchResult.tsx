import Link from 'next/link';
import { TournamentSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import RulesetIcon from '../icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { RulesetEnumHelper } from '@/lib/enums';

export default function TournamentSearchResult({
  input,
  data,
}: {
  input: string;
  data: TournamentSearchResultDTO;
}) {
  return (
    <div className="flex flex-row rounded-xl bg-accent p-2">
      <div className="mx-0.5 flex flex-1 gap-2">
        <Link href={`/tournaments/${data.id}`}>
          <p className="text-lg">{highlightMatch(data.name, input)}</p>
        </Link>
      </div>
      <div className="mx-0.5 flex flex-row gap-5 font-sans text-accent-foreground">
        <p>
          {data.lobbySize}v{data.lobbySize}
        </p>
        <SimpleTooltip
          content={RulesetEnumHelper.getMetadata(data.ruleset).text}
        >
          <RulesetIcon
            ruleset={data.ruleset}
            width={24}
            height={24}
            className="fill-primary"
          />
        </SimpleTooltip>
      </div>
    </div>
  );
}
