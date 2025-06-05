'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { TierName, getTierString } from '@/lib/utils/tierData';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

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

const createCenteredColumn = (
  accessor: keyof PlayerRatingStatsDTO,
  header: string,
  formatter?: (value: unknown) => React.ReactNode
) =>
  columnHelper.accessor(accessor, {
    header: () => <div className="text-center">{header}</div>,
    cell: ({ getValue }) => (
      <CenteredText>
        {formatter ? formatter(getValue()) : String(getValue())}
      </CenteredText>
    ),
  });

export const columns = [
  columnHelper.accessor('globalRank', {
    header: 'Rank',
    cell: ({ getValue }) => (
      <div className="flex items-center justify-between gap-3">
        <div className="flex-shrink-0">{getRankDisplay(getValue())}</div>
      </div>
    ),
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const session = useSession();

      return (
        <div className="ml-1.5 flex min-w-[150px] flex-row items-center gap-3">
          <Image
            src={`https://a.ppy.sh/${getValue()}`}
            alt={`${row.original.player.username} avatar`}
            className="flex-shrink-0 rounded-full ring-2 ring-muted/20"
            width={32}
            height={32}
          />
          {/* If the user is signed out, do not link */}
          {session ? (
            <Link
              href={`/players/${row.original.player.id}?ruleset=${row.original.ruleset}`}
              className="group"
            >
              <p className="max-w-[120px] truncate font-medium text-foreground transition-colors duration-200 group-hover:text-primary sm:max-w-full">
                {row.original.player.username}
              </p>
            </Link>
          ) : (
            <p className="max-w-[120px] truncate font-medium text-foreground transition-colors duration-200 group-hover:text-primary hover:cursor-not-allowed sm:max-w-full">
              {row.original.player.username}
            </p>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor('tierProgress.currentTier', {
    header: () => <div className="text-center">Tier</div>,
    cell: ({ row }) => {
      const tier = row.original.tierProgress.currentTier as TierName;
      const subTier = row.original.tierProgress.currentSubTier;

      return (
        <div className="flex justify-center rounded-lg">
          <SimpleTooltip content={getTierString(tier, subTier)}>
            {/* We actually have to use a div here, else we encounter a 'Maximum update depth exceeded' error */}
            <div>
              <TierIcon
                tier={tier || 'Bronze'}
                subTier={subTier}
                tooltip={false}
                width={28}
                height={28}
              />
            </div>
          </SimpleTooltip>
        </div>
      );
    },
  }),
  columnHelper.accessor('rating', {
    header: () => <div className="text-center">Rating</div>,
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
