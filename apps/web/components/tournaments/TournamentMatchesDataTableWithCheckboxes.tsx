'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { MatchRow } from '@/app/tournaments/[id]/columns';
import TournamentDataTableWithCheckboxes from './TournamentDataTableWithCheckboxes';

interface ExtendedMatchRow extends MatchRow {
  isSelected: boolean;
}

interface TournamentMatchesDataTableWithCheckboxesProps {
  columns: ColumnDef<MatchRow, unknown>[];
  data: ExtendedMatchRow[];
  onSelectMatch: (matchId: number, checked: boolean) => void;
}

/** Names the match-specific halves of the generic tournament table. */
export default function TournamentMatchesDataTableWithCheckboxes({
  columns,
  data,
  onSelectMatch,
}: TournamentMatchesDataTableWithCheckboxesProps) {
  return (
    <TournamentDataTableWithCheckboxes
      columns={columns as ColumnDef<ExtendedMatchRow>[]}
      data={data}
      getRowId={(match) => match.id}
      getRowLabel={(match) => match.name || 'match'}
      isRowSelected={(match) => match.isSelected}
      onSelectRow={onSelectMatch}
      emptyMessage="No matches found."
    />
  );
}
