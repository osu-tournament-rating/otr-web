'use client';

import {
  ColumnDef,
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table';
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

export const columns: ColumnDef<MatchRow, any>[] = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => (
      <div className="flex gap-1 -mr-3">
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
