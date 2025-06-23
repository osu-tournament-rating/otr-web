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
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-muted" />
        <span className="text-muted-foreground">
          Unknown Player (ID: {result.osuId})
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src={`https://a.ppy.sh/${result.osuId}`}
        alt={`${result.username} avatar`}
        className="flex-shrink-0 rounded-full"
        width={32}
        height={32}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <Link
        href={`/players/${result.playerId}`}
        className="truncate font-medium transition-colors hover:text-primary"
      >
        {result.username}
      </Link>
    </div>
  );
}
