import Link from 'next/link';
import { PlayerFilteringResult } from '@/lib/orpc/schema/filtering';
import { OsuAvatar } from '@/components/ui/osu-avatar';

interface PlayerCellProps {
  result: PlayerFilteringResult | null | undefined;
}

export default function PlayerCell({ result }: PlayerCellProps) {
  if (!result) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!result.username || !result.playerId || result.osuId === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-muted size-6 rounded-full" />
        <span className="text-muted-foreground text-sm">Unknown</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <OsuAvatar
        osuId={result.osuId}
        username={result.username}
        size={24}
        className="flex-shrink-0"
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
