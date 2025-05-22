import Link from 'next/link';
import Image from 'next/image';
import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import TierIcon from '../icons/TierIcon';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';
import { TierName } from '@/lib/tierData';

export default function PlayerSearchResult({
  data,
}: {
  data: PlayerSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <div className="bg-accent flex items-center rounded-xl p-3">
      <div className="flex flex-1 items-center gap-3">
        <Image
          className="rounded-full"
          width={40}
          height={40}
          src={`https://s.ppy.sh/a/${data.osuId}`}
          alt={`${data.username || 'Unknown user'}'s profile picture`}
          priority={false}
        />
        <Link href={`/players/${data.id}`} onClick={closeDialog}>
          <p className="text-lg font-medium">
            {highlightMatch(data.username ?? 'Unknown user', query)}
          </p>
        </Link>
      </div>
      <div className="text-accent-foreground flex items-center gap-3">
        {data.rating && data.ratingTier && (
          <div className="flex flex-row items-center gap-1">
            <TierIcon
              tier={data.ratingTier as TierName}
              width={24}
              height={24}
              className={cn('flex-shrink-0')}
            />
            <span className="w-[70px] text-right font-medium">
              {data.rating.toFixed(0)} TR
            </span>
          </div>
        )}
        {!!data.globalRank && (
          <div className="flex flex-row items-center gap-1">
            <Globe className="text-primary" />
            <span className="font-medium">
              #{data.globalRank.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
