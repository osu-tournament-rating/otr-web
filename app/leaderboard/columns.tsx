'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { TierName } from '@/lib/utils/tierData';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import { Crown } from 'lucide-react';

const columnHelper = createColumnHelper<PlayerRatingStatsDTO>();

const getRankDisplay = (rank: number) => {
  const rankStyles = {
    1: { crown: 'text-yellow-500', text: 'text-yellow-600' },
    2: { crown: 'text-gray-400', text: 'text-gray-600' },
    3: { crown: 'text-amber-600', text: 'text-amber-700' },
  } as const;

  const style = rankStyles[rank as keyof typeof rankStyles];

  if (style) {
    return (
      <div className="flex items-center gap-1">
        <Crown className={`h-4 w-4 ${style.crown}`} />
        <span className={`font-bold ${style.text}`}>#{rank}</span>
      </div>
    );
  }

  return <span className="font-semibold text-foreground">#{rank}</span>;
};

const CenteredText = ({ children }: { children: React.ReactNode }) => (
  <p className="text-center font-medium text-muted-foreground">{children}</p>
);

const PlayerImage = ({
  src,
  alt,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  className: string;
  width: number;
  height: number;
}) => (
  <Image
    src={src}
    alt={alt}
    className={className}
    width={width}
    height={height}
  />
);

const createCenteredColumn = (
  accessor: keyof PlayerRatingStatsDTO,
  header: string,
  formatter?: (value: unknown) => React.ReactNode
) =>
  columnHelper.accessor(accessor as any, {
    header,
    cell: ({ getValue }) => (
      <CenteredText>
        {formatter ? formatter(getValue()) : String(getValue())}
      </CenteredText>
    ),
  });

export const columns = [
  columnHelper.accessor('globalRank', {
    header: 'Rank',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[100px] flex-row items-center justify-between">
        {getRankDisplay(getValue())}
        <div className="flex items-center gap-1">
          <PlayerImage
            src={`https://assets.ppy.sh/old-flags/${row.original.player.country}.png`}
            alt={`${row.original.player.country} flag`}
            className="rounded-sm shadow-sm"
            width={24}
            height={16}
          />
          <p className="text-xs font-medium text-muted-foreground">
            #{row.original.countryRank}
          </p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[150px] flex-row items-center gap-3">
        <PlayerImage
          src={`https://a.ppy.sh/${getValue()}`}
          alt={`${row.original.player.username} avatar`}
          className="flex-shrink-0 rounded-full ring-2 ring-muted/20"
          width={32}
          height={32}
        />
        <Link href={`/players/${row.original.player.id}`} className="group">
          <p className="max-w-[120px] truncate font-medium text-foreground transition-colors duration-200 group-hover:text-primary sm:max-w-full">
            {row.original.player.username}
          </p>
        </Link>
      </div>
    ),
  }),
  columnHelper.accessor('tierProgress.currentTier', {
    header: 'Tier',
    cell: ({ row }) => (
      <div className="flex justify-center">
        <div className="rounded-lg bg-muted/20 p-1">
          <TierIcon
            tier={row.original.tierProgress.currentTier as TierName}
            subTier={row.original.tierProgress.currentSubTier}
            tooltip
            width={28}
            height={28}
          />
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('rating', {
    header: 'Rating',
    cell: ({ getValue }) => (
      <div className="flex min-w-[60px] justify-center">
        <SimpleTooltip content={`${getValue().toFixed(2)} TR`}>
          <p className="font-medium text-foreground">{getValue().toFixed(0)}</p>
        </SimpleTooltip>
      </div>
    ),
  }),
  createCenteredColumn('tournamentsPlayed', 'Tournaments'),
  createCenteredColumn('matchesPlayed', 'Matches'),
  createCenteredColumn('winRate', 'Win %', (winRate: unknown) => {
    const rate = (winRate as number) ?? 0;
    const percentage = ~~(rate * 100);
    return `${percentage}%`;
  }),
];
