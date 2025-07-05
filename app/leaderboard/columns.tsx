'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { TierName, getTierString } from '@/lib/utils/tierData';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import CountryFlag from '@/components/shared/CountryFlag';

const columnHelper = createColumnHelper<PlayerRatingStatsDTO>();

const createCenteredColumn = (
  accessor: keyof PlayerRatingStatsDTO,
  header: string,
  formatter?: (value: unknown) => React.ReactNode
) =>
  columnHelper.accessor(accessor, {
    header: () => <div className="text-center">{header}</div>,
    cell: ({ getValue }) => (
      <p className="text-center font-medium text-muted-foreground">
        {formatter ? formatter(getValue()) : String(getValue())}
      </p>
    ),
  });

export const columns = [
  createCenteredColumn('globalRank', 'Rank', (rank: unknown) => {
    return (
      <span className="font-semibold text-foreground">#{rank as number}</span>
    );
  }),
  columnHelper.accessor('player.country', {
    header: 'Country',
    cell: ({ getValue, row }) => {
      const countryRank = row.original.countryRank;
      const country = getValue();
      return (
        <Link
          href={`/leaderboard?country=${country}`}
          className="flex w-full gap-2 align-baseline font-medium text-muted-foreground"
        >
          <CountryFlag
            tooltipContent={country}
            className="w-7"
            country={country}
          />
          <span className="align-baseline">#{countryRank}</span>
        </Link>
      );
    },
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => {
      return (
        <div className="ml-1.5 flex min-w-[150px] flex-row items-center gap-3">
          <Image
            src={`https://a.ppy.sh/${getValue()}`}
            alt={`${row.original.player.username} avatar`}
            className="flex-shrink-0 rounded-full ring-2 ring-muted/20"
            width={32}
            height={32}
            unoptimized
          />
          <Link
            href={`/players/${row.original.player.id}?ruleset=${row.original.ruleset}`}
            className="group"
          >
            <p className="max-w-[120px] truncate font-medium text-foreground transition-colors duration-200 group-hover:text-primary sm:max-w-full">
              {row.original.player.username}
            </p>
          </Link>
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
