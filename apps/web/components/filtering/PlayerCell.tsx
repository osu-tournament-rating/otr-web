import Image from 'next/image';
import Link from 'next/link';
import { PlayerFilteringResult } from '@/lib/orpc/schema/filtering';

interface PlayerCellProps {
  result: PlayerFilteringResult | null | undefined;
}

export default function PlayerCell({ result }: PlayerCellProps) {
  if (!result) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!result.username || !result.playerId) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-muted size-6 rounded-full" />
        <span className="text-muted-foreground text-sm">Unknown</span>
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
        unoptimized
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <Link
        href={`/players/${result.playerId}`}
        className="max-w-30 hover:text-primary text-sm font-medium transition-colors"
      >
        {result.username}
      </Link>
    </div>
  );
}
