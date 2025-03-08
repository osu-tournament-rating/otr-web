'use client';

import { ColumnDef } from '@tanstack/react-table';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import VerificationBadge from '@/components/badges/VerificationBadge';

export type MatchRow = {
  name: string;
  verificationStatus: VerificationStatus;
  startDate: string;
};

export const columns: ColumnDef<MatchRow>[] = [
  {
    accessorKey: 'verificationStatus',
    header: 'Status',
    cell: ({ row }) => {
      /** TODO: Add warning flags here too */
      const status = row.getValue('verificationStatus') as VerificationStatus;
      return <VerificationBadge verificationStatus={status} text={false} />;
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('startDate'));
      return date.toLocaleDateString();
    },
  },
];
