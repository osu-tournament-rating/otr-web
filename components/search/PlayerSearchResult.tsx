import Link from 'next/link';
import Image from 'next/image';
import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import TierIcon from '../icons/TierIcon';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';
import { cn } from '@/lib/utils';

interface PlayerSearchResultProps {
  input: string;
  data: PlayerSearchResultDTO;
}

export default function PlayerSearchResult({ input, data }: PlayerSearchResultProps) {
  const { setDialogOpen } = useContext(SearchDialogContext);

  return (
    <div className="flex items-center rounded-xl bg-accent p-3">
      <div className="flex flex-1 items-center gap-3">
        <Image
          className="rounded-full"
          width={40}
          height={40}
          src={`https://s.ppy.sh/a/${data.osuId}`}
          alt={`${data.username || 'Unknown user'}'s profile picture`}
          priority={false}
        />
        <Link 
          href={`/players/${data.id}`} 
          onClick={() => setDialogOpen(false)}
        >
          <p className="text-lg font-medium">
            {highlightMatch(data.username ?? 'Unknown user', input)}
          </p>
        </Link>
      </div>
      <div className="flex items-center gap-3 text-accent-foreground">
        {data.rating && (
          <p className="w-[70px] text-right font-medium">
            {Number(data.rating).toFixed(0)} TR
          </p>
        )}
        {data.ratingTier && (
          <TierIcon 
            tier={data.ratingTier} 
            width={32} 
            height={32} 
            className={cn("flex-shrink-0")}
          />
        )}
      </div>
    </div>
  );
}
