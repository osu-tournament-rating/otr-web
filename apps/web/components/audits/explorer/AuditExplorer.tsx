'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';

import { FilterOptionsResponse } from '@/lib/orpc/schema/audit';
import AuditExplorerLayout from './AuditExplorerLayout';
import AuditFilterBuilder, { AuditExplorerFilter } from './AuditFilterBuilder';
import TournamentAuditTable from './TournamentAuditTable';
import TournamentTimelinePanel from './TournamentTimelinePanel';

interface AuditExplorerProps {
  filterOptions: FilterOptionsResponse;
}

export default function AuditExplorer({ filterOptions }: AuditExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filter = useMemo((): AuditExplorerFilter => {
    const q = searchParams.get('q');
    const props = searchParams.get('props');
    const userOnly = searchParams.get('userOnly');
    const tid = searchParams.get('tid');

    return {
      searchQuery: q ?? undefined,
      changedProperties: props ? props.split(',') : undefined,
      userActionsOnly: userOnly === 'true',
      selectedTournamentId: tid ? parseInt(tid, 10) : undefined,
    };
  }, [searchParams]);

  const handleSelectTournament = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filter.selectedTournamentId === id) {
        params.delete('tid');
      } else {
        params.set('tid', id.toString());
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [filter.selectedTournamentId, pathname, router, searchParams]
  );

  const handleDeselectTournament = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tid');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [pathname, router, searchParams]);

  const tableFilter = useMemo(
    () => ({
      searchQuery: filter.searchQuery,
      changedProperties: filter.changedProperties,
      userActionsOnly: filter.userActionsOnly ?? false,
    }),
    [filter.searchQuery, filter.changedProperties, filter.userActionsOnly]
  );

  return (
    <div className="space-y-4">
      <AuditFilterBuilder filter={filter} filterOptions={filterOptions} />

      <AuditExplorerLayout
        selectedId={filter.selectedTournamentId ?? null}
        onDeselect={handleDeselectTournament}
        panelTitle={
          filter.selectedTournamentId ? 'Tournament Timeline' : undefined
        }
        table={
          <TournamentAuditTable
            filter={tableFilter}
            selectedId={filter.selectedTournamentId ?? null}
            onSelect={handleSelectTournament}
          />
        }
        panel={
          <TournamentTimelinePanel
            tournamentId={filter.selectedTournamentId ?? null}
          />
        }
      />
    </div>
  );
}
