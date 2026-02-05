'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import {
  AuditActionTypeEnumHelper,
  AuditEntityTypeEnumHelper,
} from '@/lib/enums';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { getFieldOptionsWithEntityType, parseFieldOptionValue, getFieldLabel } from './auditFieldConfig';
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

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (entityType && entityType !== ALL_VALUE) {
    const types = entityType.split(',').map(Number) as AuditEntityType[];
    activeFilters.push({
      key: 'entityTypes',
      label: 'Entity',
      value: types
        .map((t) => AuditEntityTypeEnumHelper.getMetadata(t).text)
        .join(', '),
    });
  }
  if (actionType && actionType !== ALL_VALUE) {
    const types = actionType.split(',').map(Number) as AuditActionType[];
    activeFilters.push({
      key: 'actionTypes',
      label: 'Action',
      value: types
        .map((t) => AuditActionTypeEnumHelper.getMetadata(t).text)
        .join(', '),
    });
  }
  if (dateFrom) {
    activeFilters.push({
      key: 'dateFrom',
      label: 'From',
      value: format(dateFrom, 'MMM d, yyyy'),
    });
  }
  if (dateTo) {
    activeFilters.push({
      key: 'dateTo',
      label: 'To',
      value: format(dateTo, 'MMM d, yyyy'),
    });
  }
  if (fieldsChanged.length > 0) {
    const fieldLabels = fieldsChanged.map((value) => {
      const parsed = parseFieldOptionValue(value);
      if (!parsed) return value;
      return getFieldLabel(parsed.entityType, parsed.fieldName);
    });
    activeFilters.push({
      key: 'fieldChanged',
      label: fieldsChanged.length === 1 ? 'Field' : 'Fields',
      value: fieldLabels.join(', '),
    });
  }
  if (entityId) {
    activeFilters.push({
      key: 'entityId',
      label: 'ID',
      value: `#${entityId}`,
    });
  }
  if (hideSystemAudits) {
    activeFilters.push({
      key: 'adminOnly',
      label: 'Filter',
      value: 'Admin actions only',
    });
  }

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

  const clearFilter = useCallback(
    (key: string) => {
      switch (key) {
        case 'entityTypes':
          setEntityType(ALL_VALUE);
          break;
        case 'actionTypes':
          setActionType(ALL_VALUE);
          break;
        case 'dateFrom':
          setDateFrom(undefined);
          break;
        case 'dateTo':
          setDateTo(undefined);
          break;
        case 'fieldChanged':
          setFieldsChanged([]);
          break;
        case 'entityId':
          setEntityId('');
          break;
        case 'adminOnly':
          setHideSystemAudits(false);
          break;
      }
    },
    []
  );

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
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Entity ID Search */}
        <div className="relative min-w-[120px] flex-1 max-w-[200px]">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="number"
            placeholder="Entity ID..."
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Entity Type */}
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="h-9 w-[140px]">
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

        {/* Action Type */}
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All actions</SelectItem>
            {ACTION_TYPES.map((at) => {
              const meta = AuditActionTypeEnumHelper.getMetadata(at);
              return (
                <SelectItem key={at} value={String(at)}>
                  {meta.text}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Field Changed */}
        <FieldMultiSelect
          options={filteredFieldOptions}
          selected={fieldsChanged}
          onChange={setFieldsChanged}
          placeholder="Any field"
        />

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 w-[200px] justify-start text-left font-normal',
                !dateFrom && !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom && dateTo ? (
                <span className="text-sm">
                  {format(dateFrom, 'MMM d')} - {format(dateTo, 'MMM d')}
                </span>
              ) : dateFrom ? (
                <span className="text-sm">From {format(dateFrom, 'MMM d')}</span>
              ) : dateTo ? (
                <span className="text-sm">Until {format(dateTo, 'MMM d')}</span>
              ) : (
                <span className="text-sm">Date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col gap-2 p-3">
              <div className="text-muted-foreground text-xs font-medium">From</div>
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

        {/* Hide System Audits */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-system"
            checked={hideSystemAudits}
            onCheckedChange={(checked) => setHideSystemAudits(checked === true)}
          />
          <Label htmlFor="hide-system" className="text-sm cursor-pointer">
            Hide system audits
          </Label>
        </div>

        {/* Clear All */}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 py-1 pr-1"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              <span>{filter.value}</span>
              <button
                onClick={() => clearFilter(filter.key)}
                className="hover:bg-muted ml-0.5 rounded p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
