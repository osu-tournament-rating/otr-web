'use client';

import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import {
  MatchWarningFlags,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import VerificationBadge from '@/components/badges/VerificationBadge';
import WarningFlagsBadge from '@/components/badges/WarningFlagsBadge';

export type MatchRow = {
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
  };
  startDate: string;
};

const columnHelper = createColumnHelper<MatchRow>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columns: ColumnDef<MatchRow, any>[] = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => (
      <div className="-mr-3 flex gap-1">
        <VerificationBadge
          verificationStatus={getValue().verificationStatus}
          text={false}
        />
        <WarningFlagsBadge itemType={'match'} value={getValue().warningFlags} />
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
  }),
  columnHelper.accessor('startDate', {
    header: 'Start Date',
    cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
  }),
];
