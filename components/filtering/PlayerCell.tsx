import { PlayerFilteringResultDTO } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import Link from 'next/link';

interface PlayerCellProps {
  result: PlayerFilteringResultDTO | null | undefined;
}

export default function PlayerCell({ result }: PlayerCellProps) {
  if (!result) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!result.username || !result.playerId) {
    return (
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-full bg-muted" />
        <span className="text-sm text-muted-foreground">
          Unknown
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Image
        src={`https://a.ppy.sh/${result.osuId}`}
        alt={`${result.username} avatar`}
        className="flex-shrink-0 rounded-full"
        width={24}
        height={24}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <Link
        href={`/players/${result.playerId}`}
        className="truncate text-sm font-medium transition-colors hover:text-primary"
      >
        {result.username}
      </Link>
    </div>
  );
}
