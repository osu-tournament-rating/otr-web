'use client';

import { useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getFieldOptionsWithEntityType,
  parseFieldOptionValue,
  type FieldOption,
} from './auditFieldConfig';

const ALL_ENTITY_TYPES = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
] as const;

const ALL_ACTION_TYPES = [
  AuditActionType.Created,
  AuditActionType.Updated,
  AuditActionType.Deleted,
] as const;

const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  [AuditActionType.Created]: 'Created',
  [AuditActionType.Updated]: 'Updated',
  [AuditActionType.Deleted]: 'Deleted',
};

export type FilterState = {
  entityTypes: AuditEntityType[];
  fieldsChanged: { entityType: AuditEntityType; fieldName: string }[];
  showSystem: boolean;
  actionTypes: AuditActionType[];
};

type AuditFilterBarProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

function EntityTypeSelect({
  selected,
  onChange,
}: {
  selected: AuditEntityType[];
  onChange: (types: AuditEntityType[]) => void;
}) {
  const toggle = (entityType: AuditEntityType) => {
    if (selected.includes(entityType)) {
      onChange(selected.filter((t) => t !== entityType));
    } else {
      onChange([...selected, entityType]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-testid="filter-entity-type"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          Entity Type
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {ALL_ENTITY_TYPES.map((et) => {
                const label = AuditEntityTypeEnumHelper.getMetadata(et).text;
                const isSelected = selected.includes(et);
                return (
                  <CommandItem key={et} onSelect={() => toggle(et)}>
                    <Check
                      className={cn(
                        'h-3.5 w-3.5',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FieldSelect({
  selected,
  onChange,
  entityTypeFilter,
}: {
  selected: { entityType: AuditEntityType; fieldName: string }[];
  onChange: (
    fields: { entityType: AuditEntityType; fieldName: string }[]
  ) => void;
  entityTypeFilter: AuditEntityType[];
}) {
  const allOptions = useMemo(() => getFieldOptionsWithEntityType(), []);

  const filteredOptions = useMemo(() => {
    if (entityTypeFilter.length === 0) return allOptions;
    return allOptions.filter((opt) =>
      entityTypeFilter.includes(opt.entityType)
    );
  }, [allOptions, entityTypeFilter]);

  const isSelected = (opt: FieldOption) =>
    selected.some(
      (s) =>
        s.entityType === opt.entityType &&
        s.fieldName === opt.value.split(':')[1]
    );

  const toggle = (opt: FieldOption) => {
    const parsed = parseFieldOptionValue(opt.value);
    if (!parsed) return;

    if (isSelected(opt)) {
      onChange(
        selected.filter(
          (s) =>
            !(
              s.entityType === parsed.entityType &&
              s.fieldName === parsed.fieldName
            )
        )
      );
    } else {
      onChange([
        ...selected,
        { entityType: parsed.entityType, fieldName: parsed.fieldName },
      ]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-testid="filter-field-updated"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          Field Updated
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search fields..." />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem key={opt.value} onSelect={() => toggle(opt)}>
                  <Check
                    className={cn(
                      'h-3.5 w-3.5',
                      isSelected(opt) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{opt.label}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {opt.entityLabel}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ActionTypeSelect({
  selected,
  onChange,
}: {
  selected: AuditActionType[];
  onChange: (types: AuditActionType[]) => void;
}) {
  const toggle = (actionType: AuditActionType) => {
    if (selected.includes(actionType)) {
      onChange(selected.filter((t) => t !== actionType));
    } else {
      onChange([...selected, actionType]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-testid="filter-action-type"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          Action Type
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {ALL_ACTION_TYPES.map((at) => {
                const isSelected = selected.includes(at);
                return (
                  <CommandItem key={at} onSelect={() => toggle(at)}>
                    <Check
                      className={cn(
                        'h-3.5 w-3.5',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {ACTION_TYPE_LABELS[at]}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AuditFilterBar({
  filters,
  onChange,
}: AuditFilterBarProps): React.JSX.Element {
  const hasActiveFilters =
    filters.entityTypes.length > 0 ||
    filters.fieldsChanged.length > 0 ||
    filters.actionTypes.length > 0;

  const handleEntityTypesChange = (entityTypes: AuditEntityType[]) => {
    // Prune field selections that no longer match selected entity types
    const prunedFields =
      entityTypes.length > 0
        ? filters.fieldsChanged.filter((f) =>
            entityTypes.includes(f.entityType)
          )
        : filters.fieldsChanged;

    onChange({ ...filters, entityTypes, fieldsChanged: prunedFields });
  };

  return (
    <div
      data-testid="audit-filter-bar"
      className="flex flex-wrap items-center gap-2"
    >
      <ActionTypeSelect
        selected={filters.actionTypes}
        onChange={(actionTypes) => onChange({ ...filters, actionTypes })}
      />

      <EntityTypeSelect
        selected={filters.entityTypes}
        onChange={handleEntityTypesChange}
      />

      <FieldSelect
        selected={filters.fieldsChanged}
        onChange={(fieldsChanged) => onChange({ ...filters, fieldsChanged })}
        entityTypeFilter={filters.entityTypes}
      />

      <div className="flex items-center gap-2">
        <Checkbox
          data-testid="filter-show-system"
          id="show-system"
          checked={filters.showSystem}
          onCheckedChange={(checked) =>
            onChange({ ...filters, showSystem: checked === true })
          }
        />
        <label
          htmlFor="show-system"
          className="text-muted-foreground cursor-pointer text-sm"
        >
          Show system events
        </label>
      </div>

      {hasActiveFilters && (
        <Button
          data-testid="filter-clear"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={() =>
            onChange({
              ...filters,
              entityTypes: [],
              fieldsChanged: [],
              actionTypes: [],
            })
          }
        >
          <X className="h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
