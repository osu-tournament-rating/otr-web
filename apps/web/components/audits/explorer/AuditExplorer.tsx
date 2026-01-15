'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';

import { AuditActionType } from '@otr/core/osu';

import { FilterOptionsResponse, PropertyFilter } from '@/lib/orpc/schema/audit';
import { AuditFilterState, AuditUnifiedFilter } from '../filters';
import AuditExplorerLayout from './AuditExplorerLayout';
import TournamentAuditTable from './TournamentAuditTable';
import TournamentTimelinePanel from './TournamentTimelinePanel';

function parsePropertyFilters(
  propsParam: string | null
): PropertyFilter[] | undefined {
  if (!propsParam) return undefined;
  const parsed = propsParam
    .split(',')
    .map((p) => {
      const [property, entityTypeStr] = p.split(':');
      return { property, entityType: parseInt(entityTypeStr, 10) };
    })
    .filter((p) => p.property && !isNaN(p.entityType));
  return parsed.length > 0 ? parsed : undefined;
}

function parseActionTypes(
  actionsParam: string | null
): AuditActionType[] | undefined {
  if (!actionsParam) return undefined;
  const parsed = actionsParam
    .split(',')
    .map((s) => parseInt(s, 10) as AuditActionType)
    .filter((n) => !isNaN(n) && n >= 0 && n <= 2);
  return parsed.length > 0 ? parsed : undefined;
}

interface AuditExplorerProps {
  filterOptions: FilterOptionsResponse;
}

export default function AuditExplorer({ filterOptions }: AuditExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filter = useMemo((): AuditFilterState => {
    const q = searchParams.get('q');
    const props = searchParams.get('props');
    const userOnly = searchParams.get('userOnly');
    const tid = searchParams.get('tid');
    const after = searchParams.get('after');
    const before = searchParams.get('before');
    const actions = searchParams.get('actions');
    const actor = searchParams.get('actor');

    return {
      searchQuery: q ?? undefined,
      changedProperties: parsePropertyFilters(props),
      userActionsOnly: userOnly === 'true',
      selectedTournamentId: tid ? parseInt(tid, 10) : undefined,
      activityAfter: after ?? undefined,
      activityBefore: before ?? undefined,
      actionTypes: parseActionTypes(actions),
      actionUserId: actor ? parseInt(actor, 10) : undefined,
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
      activityAfter: filter.activityAfter,
      activityBefore: filter.activityBefore,
      actionUserId: filter.actionUserId,
    }),
    [
      filter.searchQuery,
      filter.changedProperties,
      filter.userActionsOnly,
      filter.activityAfter,
      filter.activityBefore,
      filter.actionUserId,
    ]
  );

  return (
    <div className="space-y-4">
      <AuditUnifiedFilter filter={filter} filterOptions={filterOptions} />

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
            changedProperties={filter.changedProperties}
          />
        }
      />
    </div>
  );
}
