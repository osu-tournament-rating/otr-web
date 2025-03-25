import Link from 'next/link';
import Image from 'next/image';
import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import TierIcon from '../icons/TierIcon';
import { highlightMatch } from '@/lib/utils/search';

export default function PlayerSearchResult({
  input,
  data,
}: {
  input: string;
  data: PlayerSearchResultDTO;
}) {
  return (
    <div className="flex flex-row rounded-xl bg-accent p-2">
      <div className="flex flex-1 gap-2">
        <Image
          className="rounded-full"
          width={32}
          height={32}
          src={`https://s.ppy.sh/a/${data.osuId}`}
          alt={`${data.osuId} profile picture`}
        />
        <Link href={`/players/${data.id}`}>
          <p className="text-lg">
            {highlightMatch(data.username ?? 'Unknown user', input)}
          </p>
        </Link>
      </div>
      <div className="flex flex-row gap-3 text-accent-foreground">
        {data.rating && (
          <p className="m-auto w-[70px] text-right">
            {Number(data.rating).toFixed(0)} TR
          </p>
        )}
        {data.ratingTier && (
          <TierIcon tier={data.ratingTier} width={32} height={32} />
        )}
      </div>
    </div>
  );
}
