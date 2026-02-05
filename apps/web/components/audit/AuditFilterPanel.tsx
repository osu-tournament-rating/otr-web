'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import {
  AuditActionTypeEnumHelper,
  AuditEntityTypeEnumHelper,
} from '@/lib/enums';
import { getTrackedFieldsForTypes, getFieldLabel } from './auditFieldConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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

export default function AuditFilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [entityTypes, setEntityTypes] = useState<AuditEntityType[]>(() => {
    const param = searchParams.get('entityTypes');
    return param
      ? (param.split(',').map(Number) as AuditEntityType[])
      : [];
  });
  const [actionTypes, setActionTypes] = useState<AuditActionType[]>(() => {
    const param = searchParams.get('actionTypes');
    return param
      ? (param.split(',').map(Number) as AuditActionType[])
      : [];
  });
  const [adminOnly, setAdminOnly] = useState(
    searchParams.get('adminOnly') === 'true'
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');
  const [fieldChanged, setFieldChanged] = useState(
    searchParams.get('fieldChanged') ?? ''
  );
  const [entityId, setEntityId] = useState(searchParams.get('entityId') ?? '');

  const availableFields = getTrackedFieldsForTypes(
    entityTypes.length > 0 ? entityTypes : [...ENTITY_TYPES]
  );

  const hasFilters =
    entityTypes.length > 0 ||
    actionTypes.length > 0 ||
    adminOnly ||
    dateFrom ||
    dateTo ||
    fieldChanged ||
    entityId;

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (entityTypes.length > 0)
      params.set('entityTypes', entityTypes.join(','));
    if (actionTypes.length > 0)
      params.set('actionTypes', actionTypes.join(','));
    if (adminOnly) params.set('adminOnly', 'true');
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (fieldChanged) params.set('fieldChanged', fieldChanged);
    if (entityId) params.set('entityId', entityId);

    const qs = params.toString();
    router.push(qs ? `/tools/audit-logs?${qs}` : '/tools/audit-logs');
  }, [
    entityTypes,
    actionTypes,
    adminOnly,
    dateFrom,
    dateTo,
    fieldChanged,
    entityId,
    router,
  ]);

  const clearFilters = useCallback(() => {
    setEntityTypes([]);
    setActionTypes([]);
    setAdminOnly(false);
    setDateFrom('');
    setDateTo('');
    setFieldChanged('');
    setEntityId('');
    router.push('/tools/audit-logs');
  }, [router]);

  function toggleEntityType(et: AuditEntityType) {
    setEntityTypes((prev) =>
      prev.includes(et) ? prev.filter((v) => v !== et) : [...prev, et]
    );
  }

  function toggleActionType(at: AuditActionType) {
    setActionTypes((prev) =>
      prev.includes(at) ? prev.filter((v) => v !== at) : [...prev, at]
    );
  }

  return (
    <div className="bg-card border-border space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Entity Types */}
      <div className="space-y-2">
        <Label className="text-xs">Entity Type</Label>
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map((et) => {
            const meta = AuditEntityTypeEnumHelper.getMetadata(et);
            const active = entityTypes.includes(et);
            return (
              <button
                key={et}
                onClick={() => toggleEntityType(et)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {meta.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Types */}
      <div className="space-y-2">
        <Label className="text-xs">Action Type</Label>
        <div className="flex flex-wrap gap-2">
          {ACTION_TYPES.map((at) => {
            const meta = AuditActionTypeEnumHelper.getMetadata(at);
            const active = actionTypes.includes(at);
            return (
              <button
                key={at}
                onClick={() => toggleActionType(at)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {meta.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin only toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={adminOnly}
          onCheckedChange={(checked) => setAdminOnly(checked === true)}
          id="admin-only"
        />
        <Label htmlFor="admin-only" className="text-xs">
          Admin actions only
        </Label>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Field changed */}
      <div className="space-y-1">
        <Label className="text-xs">Field Changed</Label>
        <select
          value={fieldChanged}
          onChange={(e) => setFieldChanged(e.target.value)}
          className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
        >
          <option value="">Any field</option>
          {availableFields.map((field) => (
            <option key={field} value={field}>
              {getFieldLabel(
                entityTypes[0] ?? AuditEntityType.Tournament,
                field
              )}
            </option>
          ))}
        </select>
      </div>

      {/* Entity ID */}
      <div className="space-y-1">
        <Label className="text-xs">Entity ID</Label>
        <Input
          type="number"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="Filter by entity ID"
          className="h-8 text-xs"
        />
      </div>

      <Button onClick={applyFilters} size="sm" className="w-full">
        Apply Filters
      </Button>
    </div>
  );
}
