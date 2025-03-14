'use client';

import VerificationBadge from '@/components/badges/VerificationBadge';
import WarningFlagsBadge from '@/components/badges/WarningFlagsBadge';
import {
  MatchWarningFlags,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';

export type MatchRow = {
  id: number;
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
  };
  startDate: string;
};

const columnHelper = createColumnHelper<MatchRow>();

export const columns = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => (
      <div className="-mr-3 flex gap-1">
        <VerificationBadge verificationStatus={getValue().verificationStatus} />
        <WarningFlagsBadge itemType={'match'} value={getValue().warningFlags} />
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue, row }) => (
      <Link href={`/matches/${row.original.id}`}>{getValue()}</Link>
    ),
  }),
  columnHelper.accessor('startDate', {
    header: 'Start Date',
    cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
  }),
];
