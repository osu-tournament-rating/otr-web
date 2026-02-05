'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getFieldOptionsWithEntityType } from './auditFieldConfig';
import FieldMultiSelect from './FieldMultiSelect';

const ALL_VALUE = '__all__';

const ENTITY_TYPES = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
] as const;

const ACTION_TYPES = [
  AuditActionType.Created,
  AuditActionType.Updated,
  AuditActionType.Deleted,
] as const;

export default function AuditFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [entityType, setEntityType] = useState<string>(
    searchParams.get('entityTypes') || ALL_VALUE
  );
  const [actionType, setActionType] = useState<string>(
    searchParams.get('actionTypes') || ALL_VALUE
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const param = searchParams.get('dateFrom');
    return param ? new Date(param) : undefined;
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => {
    const param = searchParams.get('dateTo');
    return param ? new Date(param) : undefined;
  });
  const [fieldsChanged, setFieldsChanged] = useState<string[]>(() => {
    const param = searchParams.get('fieldChanged');
    return param ? param.split(',') : [];
  });
  const [entityId, setEntityId] = useState(searchParams.get('entityId') ?? '');
  const [hideSystemAudits, setHideSystemAudits] = useState(
    searchParams.get('adminOnly') === 'true'
  );

  const selectedEntityTypes = entityType && entityType !== ALL_VALUE
    ? (entityType.split(',').map(Number) as AuditEntityType[])
    : [];

  // Get all field options with entity type context
  const allFieldOptions = getFieldOptionsWithEntityType();
  // Filter to selected entity types if any
  const filteredFieldOptions = selectedEntityTypes.length > 0
    ? allFieldOptions.filter((opt) => selectedEntityTypes.includes(opt.entityType))
    : allFieldOptions;

  // Count active filters for the Clear all button
  const activeFilterCount = [
    entityType !== ALL_VALUE,
    actionType !== ALL_VALUE,
    dateFrom !== undefined,
    dateTo !== undefined,
    fieldsChanged.length > 0,
    entityId !== '',
    hideSystemAudits,
  ].filter(Boolean).length;

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (entityType && entityType !== ALL_VALUE) params.set('entityTypes', entityType);
    if (actionType && actionType !== ALL_VALUE) params.set('actionTypes', actionType);
    if (dateFrom) params.set('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.set('dateTo', format(dateTo, 'yyyy-MM-dd'));
    if (fieldsChanged.length > 0) params.set('fieldChanged', fieldsChanged.join(','));
    if (entityId) params.set('entityId', entityId);
    if (hideSystemAudits) params.set('adminOnly', 'true');

    const qs = params.toString();
    router.push(qs ? `/tools/audit-logs?${qs}` : '/tools/audit-logs');
  }, [entityType, actionType, dateFrom, dateTo, fieldsChanged, entityId, hideSystemAudits, router]);

  const clearAllFilters = useCallback(() => {
    setEntityType(ALL_VALUE);
    setActionType(ALL_VALUE);
    setDateFrom(undefined);
    setDateTo(undefined);
    setFieldsChanged([]);
    setEntityId('');
    setHideSystemAudits(false);
    router.push('/tools/audit-logs');
  }, [router]);

  // Apply filters immediately on change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [entityType, actionType, dateFrom, dateTo, fieldsChanged, entityId, hideSystemAudits, applyFilters]);

  return (
    <div className="bg-popover flex flex-wrap items-center gap-3 rounded-lg p-3">
      {/* Search Group */}
      <div className="relative min-w-[140px] flex-1 max-w-[200px]">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="number"
          placeholder="Entity ID..."
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className={cn('h-9 pl-9 text-sm', entityId && 'pr-8')}
        />
        {entityId && (
          <button
            onClick={() => setEntityId('')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
            aria-label="Clear entity ID"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Entity Type */}
        <div className="relative">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className={cn('h-9 w-[140px]', entityType !== ALL_VALUE && 'pr-8')}>
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All entities</SelectItem>
              {ENTITY_TYPES.map((et) => {
                const meta = AuditEntityTypeEnumHelper.getMetadata(et);
                return (
                  <SelectItem key={et} value={String(et)}>
                    {meta.text}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {entityType !== ALL_VALUE && (
            <button
              onClick={() => setEntityType(ALL_VALUE)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
              aria-label="Clear entity type"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Action Type */}
        <div className="relative">
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className={cn('h-9 w-[130px]', actionType !== ALL_VALUE && 'pr-8')}>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All actions</SelectItem>
              {ACTION_TYPES.map((at) => (
                <SelectItem key={at} value={String(at)}>
                  {at === AuditActionType.Created
                    ? 'Created'
                    : at === AuditActionType.Updated
                      ? 'Updated'
                      : 'Deleted'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionType !== ALL_VALUE && (
            <button
              onClick={() => setActionType(ALL_VALUE)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
              aria-label="Clear action type"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Field Changed */}
        <FieldMultiSelect
          options={filteredFieldOptions}
          selected={fieldsChanged}
          onChange={setFieldsChanged}
          onClear={() => setFieldsChanged([])}
          placeholder="Any field"
        />

        {/* Date Range */}
        <div className="relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-9 w-[170px] justify-start text-left font-normal',
                  !dateFrom && !dateTo && 'text-muted-foreground',
                  (dateFrom || dateTo) && 'pr-8'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {dateFrom && dateTo ? (
                  <span className="truncate text-sm">
                    {format(dateFrom, 'MMM d')} - {format(dateTo, 'MMM d')}
                  </span>
                ) : dateFrom ? (
                  <span className="truncate text-sm">
                    From {format(dateFrom, 'MMM d')}
                  </span>
                ) : dateTo ? (
                  <span className="truncate text-sm">
                    Until {format(dateTo, 'MMM d')}
                  </span>
                ) : (
                  <span className="text-sm">Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex flex-col gap-2 p-3">
                <div className="text-muted-foreground text-xs font-medium">
                  From
                </div>
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
                <div className="text-muted-foreground text-xs font-medium">To</div>
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => date > new Date()}
                />
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                    className="mt-2"
                  >
                    Clear dates
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
              aria-label="Clear date range"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Options - inline with filters */}
      <div className="flex items-center gap-2 border-l border-border/50 pl-3">
        <Checkbox
          id="hide-system"
          checked={hideSystemAudits}
          onCheckedChange={(checked) => setHideSystemAudits(checked === true)}
        />
        <Label htmlFor="hide-system" className="text-muted-foreground cursor-pointer text-sm whitespace-nowrap">
          Hide system
        </Label>
      </div>

      {/* Clear All - pushed to right */}
      {activeFilterCount > 0 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={clearAllFilters}
          className="ml-auto h-8 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
