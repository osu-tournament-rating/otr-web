'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ReportEntityType } from '@otr/core/osu';

import { FilterProperty, PropertyFilter } from '@/lib/orpc/schema/audit';
import { toSentenceCase } from '@/lib/utils/toSentenceCase';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AuditEntityBadge from '../AuditEntityBadge';

const ENTITY_ORDER = [
  ReportEntityType.Tournament,
  ReportEntityType.Match,
  ReportEntityType.Game,
  ReportEntityType.Score,
] as const;

const ENTITY_LABELS: Record<ReportEntityType, string> = {
  [ReportEntityType.Tournament]: 'Tournament',
  [ReportEntityType.Match]: 'Match',
  [ReportEntityType.Game]: 'Game',
  [ReportEntityType.Score]: 'Score',
};

interface PropertyFilterSectionProps {
  properties: FilterProperty[];
  selectedProperties: PropertyFilter[];
  onPropertyToggle: (prop: FilterProperty) => void;
}

export default function PropertyFilterSection({
  properties,
  selectedProperties,
  onPropertyToggle,
}: PropertyFilterSectionProps) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<ReportEntityType>>(
    new Set(ENTITY_ORDER)
  );

  const groupedProperties = useMemo(() => {
    const filtered = search
      ? properties.filter((p) =>
          toSentenceCase(p.name).toLowerCase().includes(search.toLowerCase())
        )
      : properties;

    const groups = new Map<ReportEntityType, FilterProperty[]>();

    for (const entityType of ENTITY_ORDER) {
      const entityProps = filtered
        .filter((p) => p.entityType === entityType)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (entityProps.length > 0) {
        groups.set(entityType, entityProps);
      }
    }

    return groups;
  }, [properties, search]);

  const isSelected = (prop: FilterProperty): boolean => {
    return selectedProperties.some(
      (p) => p.property === prop.name && p.entityType === prop.entityType
    );
  };

  const toggleGroup = (entityType: ReportEntityType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(entityType)) {
        next.delete(entityType);
      } else {
        next.add(entityType);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search properties..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8"
      />

      <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
        {ENTITY_ORDER.map((entityType) => {
          const entityProps = groupedProperties.get(entityType);
          if (!entityProps) return null;

          const isExpanded = expandedGroups.has(entityType);

          return (
            <Collapsible
              key={entityType}
              open={isExpanded}
              onOpenChange={() => toggleGroup(entityType)}
            >
              <CollapsibleTrigger className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    !isExpanded && '-rotate-90'
                  )}
                />
                <span className="flex-1 text-left">
                  {ENTITY_LABELS[entityType]}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-6 space-y-0.5 py-1">
                  {entityProps.map((prop) => (
                    <label
                      key={`${prop.name}-${prop.entityType}`}
                      className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5"
                    >
                      <Checkbox
                        checked={isSelected(prop)}
                        onCheckedChange={() => onPropertyToggle(prop)}
                      />
                      <span className="flex-1 text-sm">
                        {toSentenceCase(prop.name)}
                      </span>
                      <AuditEntityBadge entityType={prop.entityType} />
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
