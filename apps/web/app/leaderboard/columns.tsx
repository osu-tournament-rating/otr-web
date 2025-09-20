'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import CountryFlag from '@/components/shared/CountryFlag';
import { LeaderboardEntry } from '@/lib/orpc/schema/leaderboard';
import { TierName, getTierString } from '@/lib/utils/tierData';
import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';

export const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: 'globalRank',
    header: () => <div className="text-center">Rank</div>,
    cell: ({ getValue }) => {
      const rank = getValue<number>() ?? 0;
      return (
        <span className="text-center font-semibold text-foreground">
          #{rank}
        </span>
      );
    },
  },
  {
    id: 'player.country',
    accessorFn: (row) => row.player.country,
    header: 'Country',
    cell: ({ row }) => {
      const country = row.original.player.country;
      const countryRank = row.original.countryRank;
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
  },
  {
    id: 'player.osuId',
    accessorFn: (row) => row.player.osuId,
    header: 'Player',
    cell: ({ row }) => {
      const player = row.original.player;
      return (
        <div className="ml-1.5 flex min-w-[150px] flex-row items-center gap-3">
          <Image
            src={`https://a.ppy.sh/${player.osuId}`}
            alt={`${player.username} avatar`}
            className="flex-shrink-0 rounded-full ring-2 ring-muted/20"
            width={32}
            height={32}
            unoptimized
          />
          <Link
            href={`/players/${player.id}?ruleset=${row.original.ruleset}`}
            className="group"
          >
            <p className="max-w-[120px] truncate font-medium text-foreground transition-colors duration-200 group-hover:text-primary sm:max-w-full">
              {player.username}
            </p>
          </Link>
        </div>
      );
    },
  },
  {
    id: 'tierProgress.currentTier',
    accessorFn: (row) => row.tierProgress.currentTier,
    header: () => <div className="text-center">Tier</div>,
    cell: ({ row }) => {
      const tier = row.original.tierProgress.currentTier as TierName;
      const subTier = row.original.tierProgress.currentSubTier ?? undefined;

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
  },
  {
    accessorKey: 'rating',
    header: () => <div className="text-center">Rating</div>,
    cell: ({ getValue }) => {
      const rating = getValue<number>() ?? 0;
      return (
        <div className="flex min-w-[60px] justify-center">
          <SimpleTooltip content={`${rating.toFixed(2)} TR`}>
            <p className="font-medium text-foreground">{rating.toFixed(0)}</p>
          </SimpleTooltip>
        </div>
      );
    },
  },
  {
    accessorKey: 'tournamentsPlayed',
    header: () => <div className="text-center">Tournaments</div>,
    cell: ({ getValue }) => {
      const tournaments = getValue<number>() ?? 0;
      return (
        <p className="text-center font-medium text-muted-foreground">
          {tournaments}
        </p>
      );
    },
  },
  {
    accessorKey: 'matchesPlayed',
    header: () => <div className="text-center">Matches</div>,
    cell: ({ getValue }) => {
      const matches = getValue<number>() ?? 0;
      return (
        <p className="text-center font-medium text-muted-foreground">
          {matches}
        </p>
      );
    },
  },
  {
    accessorKey: 'winRate',
    header: () => <div className="text-center">Win %</div>,
    cell: ({ getValue }) => {
      const rate = getValue<number>() ?? 0;
      const percentage = Math.round(rate * 100);
      return (
        <p className="text-center font-medium text-muted-foreground">
          {percentage}%
        </p>
      );
    },
  },
];
