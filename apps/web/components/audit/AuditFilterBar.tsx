'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';

import { ActiveFilterChips } from '@/components/kit/lists/ActiveFilterChips';
import {
  ChoiceFilter,
  FilterField,
  FilterPanel,
} from '@/components/kit/lists/FilterPanel';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ENTITY_TYPE_LABELS } from '@/lib/audit-entity-types';
import { formatChoiceFilterLabel } from '@/lib/kit/lists/filters';
import type { ListState } from '@/lib/kit/lists/params';
import type { UseListStateResult } from '@/lib/kit/lists/use-list-state';
import { cn } from '@/lib/utils';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_FIELD_OPTIONS,
  AUDIT_LOG_PARAMS,
  AUDITED_ENTITY_TYPES,
  getAuditFieldOption,
  getEntityTypeName,
  toAuditEntityType,
  type AuditFieldOption,
} from './auditParams';
import { AuditSystemSwitch } from './AuditSystemSwitch';

type AuditLogList = UseListStateResult<typeof AUDIT_LOG_PARAMS>;
type AuditLogState = ListState<typeof AUDIT_LOG_PARAMS>;

const ENTITY_OPTIONS = AUDITED_ENTITY_TYPES.map((entityType) => ({
  value: ENTITY_TYPE_LABELS[entityType],
  label: getEntityTypeName(entityType),
}));

function actionName(value: string): string {
  return (
    AUDIT_ACTION_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

function entityName(value: string): string {
  const entityType = toAuditEntityType(value);
  return entityType === undefined ? value : getEntityTypeName(entityType);
}

/** "Name (Tournament)": field names repeat across entity types. */
function fieldName(value: string): string {
  const option = getAuditFieldOption(value);
  return option
    ? `${option.label} (${getEntityTypeName(option.entityType)})`
    : value;
}

/**
 * Searchable list of every audited field, grouped by entity type. A
 * handful of chips would not fit about a hundred fields.
 */
function FieldFilter({
  value,
  entityFilter,
  onValueChange,
}: {
  value: readonly string[];
  entityFilter: readonly string[];
  onValueChange: (value: string[]) => void;
}) {
  const groups = useMemo(() => {
    const allowed = new Set(
      entityFilter.map(toAuditEntityType).filter((type) => type !== undefined)
    );
    return AUDITED_ENTITY_TYPES.filter(
      (entityType) => allowed.size === 0 || allowed.has(entityType)
    ).map((entityType) => ({
      entityType,
      options: AUDIT_FIELD_OPTIONS.filter(
        (option) => option.entityType === entityType
      ),
    }));
  }, [entityFilter]);

  const toggle = (option: AuditFieldOption) => {
    const next = value.includes(option.value)
      ? value.filter((item) => item !== option.value)
      : [...value, option.value];
    onValueChange(next);
  };

  return (
    <FilterField label="Field updated">
      <Command
        data-testid="filter-field-updated"
        className="rounded-md border bg-background dark:bg-input/30"
      >
        <CommandInput placeholder="Search fields" aria-label="Search fields" />
        <CommandList className="max-h-56">
          <CommandEmpty>No fields found.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup
              key={group.entityType}
              heading={getEntityTypeName(group.entityType)}
            >
              {group.options.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[
                      option.label,
                      getEntityTypeName(option.entityType),
                    ]}
                    onSelect={() => toggle(option)}
                  >
                    <Check
                      aria-hidden="true"
                      className={cn(
                        'size-3.5 text-foreground',
                        selected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="min-w-0 flex-1">{option.label}</span>
                    {selected ? (
                      <span className="sr-only">, selected</span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </FilterField>
  );
}

/**
 * The audit log's toolbar strip: the Filters button with action type,
 * entity type and changed field, the system events switch, and a chip per
 * active filter. Every control lives in the page address.
 */
export default function AuditFilterBar({
  list,
}: {
  list: AuditLogList;
}): React.JSX.Element {
  const { state, setState } = list;

  // Choosing entity types drops fields that belong to the others.
  const setEntities = (entity: AuditLogState['entity']) => {
    const field =
      entity.length > 0
        ? state.field.filter((value) => {
            const option = getAuditFieldOption(value);
            return (
              option !== undefined &&
              entity.includes(ENTITY_TYPE_LABELS[option.entityType])
            );
          })
        : state.field;
    setState({ entity, field });
  };

  return (
    <ListToolbar
      data-testid="audit-filter-bar"
      label="Filter audit events"
      filters={
        <FilterPanel
          title="Filter audit events"
          activeCount={list.activeFilterCount}
          onClearAll={list.clearFilters}
        >
          <ChoiceFilter
            label="Action type"
            options={AUDIT_ACTION_OPTIONS}
            value={state.action}
            onValueChange={(action) => setState({ action })}
          />
          <ChoiceFilter
            label="Entity type"
            options={ENTITY_OPTIONS}
            value={state.entity}
            onValueChange={setEntities}
          />
          <FieldFilter
            value={state.field}
            entityFilter={state.entity}
            onValueChange={(field) => setState({ field })}
          />
        </FilterPanel>
      }
      // Not a filter: it widens the feed, so it leads the strip.
      leading={
        <AuditSystemSwitch
          data-testid="filter-show-system"
          checked={state.system}
          onCheckedChange={(system) => setState({ system })}
        />
      }
      activeFilters={
        <ActiveFilterChips
          onClearAll={list.clearFilters}
          filters={[
            {
              key: 'action',
              label: formatChoiceFilterLabel(
                'Action type',
                state.action.map(actionName)
              ),
              onRemove: () => setState({ action: [] }),
            },
            {
              key: 'entity',
              label: formatChoiceFilterLabel(
                'Entity type',
                state.entity.map(entityName)
              ),
              onRemove: () => setState({ entity: [] }),
            },
            {
              key: 'field',
              label: formatChoiceFilterLabel(
                'Field updated',
                state.field.map(fieldName)
              ),
              onRemove: () => setState({ field: [] }),
            },
          ]}
        />
      }
    />
  );
}
