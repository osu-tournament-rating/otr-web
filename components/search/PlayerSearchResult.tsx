import Link from 'next/link';
import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import TierIcon from '../icons/TierIcon';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';
import { Globe, User } from 'lucide-react';
import { TierName } from '@/lib/utils/tierData';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import TRText from '../rating/TRText';

export default function PlayerSearchResult({
  data,
}: {
  data: PlayerSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <Card className="border-none bg-popover p-4 transition-colors hover:bg-popover/80">
      <Link
        href={`/players/${data.id}`}
        onClick={closeDialog}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={`https://a.ppy.sh/${data.osuId}`}
              alt={`${data.username || 'Unknown user'}'s profile picture`}
            />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <p className="text-lg font-medium">
            {highlightMatch(data.username ?? 'Unknown user', query)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {data.rating && data.tierProgress && (
            <div className="flex items-center gap-2">
              <TierIcon
                tier={data.tierProgress.currentTier as TierName}
                subTier={data.tierProgress.currentSubTier}
                width={20}
                height={20}
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium">
                {data.rating.toFixed(0)} <TRText />
              </span>
            </div>
          )}

          {!!data.globalRank && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                #{data.globalRank.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </Link>
    </Card>
  );
}
