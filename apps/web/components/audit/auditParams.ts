import { AuditActionType, AuditEntityType } from '@otr/core/osu';

import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import { listAuditFields } from '@/lib/kit/format/audit';
import {
  arrayParam,
  booleanParam,
  defineListParams,
  enumParam,
} from '@/lib/kit/lists/params';

/** Entity types in the order the filters and tabs list them. */
export const AUDITED_ENTITY_TYPES = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
  AuditEntityType.Beatmap,
] as const;

/** "Tournament", for filter options and fallback names. */
export function getEntityTypeName(entityType: AuditEntityType): string {
  const label = ENTITY_TYPE_LABELS[entityType];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * An entity's name, or the fallback when it has none. Some matches are
 * stored with an empty name, which would leave a link or title blank.
 */
export function nameOr(
  name: string | null | undefined,
  fallback: string
): string {
  return name != null && name.trim() !== '' ? name : fallback;
}

const ACTION_KEYS = {
  created: AuditActionType.Created,
  updated: AuditActionType.Updated,
  deleted: AuditActionType.Deleted,
} as const;

export type AuditActionKey = keyof typeof ACTION_KEYS;

export const AUDIT_ACTION_OPTIONS: readonly {
  value: AuditActionKey;
  label: string;
}[] = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
];

export function toAuditActionType(key: AuditActionKey): AuditActionType {
  return ACTION_KEYS[key];
}

/** Entity types in the address read as words: `entity=tournament`. */
const ENTITY_KEYS = AUDITED_ENTITY_TYPES.map(
  (entityType) => ENTITY_TYPE_LABELS[entityType]
);

export function toAuditEntityType(key: string): AuditEntityType | undefined {
  return AUDITED_ENTITY_TYPES.find(
    (entityType) => ENTITY_TYPE_LABELS[entityType] === key
  );
}

export interface AuditFieldOption {
  /** `tournament.verificationStatus`, as the address writes it. */
  value: string;
  entityType: AuditEntityType;
  field: string;
  label: string;
}

/** Every audited field, entity by entity, for the "Field updated" filter. */
export const AUDIT_FIELD_OPTIONS: readonly AuditFieldOption[] =
  listAuditFields().map(({ entityType, field, label }) => ({
    value: `${ENTITY_TYPE_LABELS[entityType]}.${field}`,
    entityType,
    field,
    label,
  }));

const FIELD_OPTIONS_BY_VALUE = new Map(
  AUDIT_FIELD_OPTIONS.map((option) => [option.value, option])
);

export function getAuditFieldOption(
  value: string
): AuditFieldOption | undefined {
  return FIELD_OPTIONS_BY_VALUE.get(value);
}

/** The audit log's filters, kept in the page address. */
export const AUDIT_LOG_PARAMS = defineListParams({
  action: arrayParam(AUDIT_ACTION_OPTIONS.map((option) => option.value)),
  entity: arrayParam(ENTITY_KEYS),
  field: arrayParam(AUDIT_FIELD_OPTIONS.map((option) => option.value)),
  // A visible switch, not a filter: "Clear all" leaves it alone.
  system: booleanParam({ role: 'scope' }),
});

/** `self` is the entity's own history; the rest are its descendants. */
export const AUDIT_HISTORY_TABS = [
  'self',
  ENTITY_TYPE_PLURALS[AuditEntityType.Match],
  ENTITY_TYPE_PLURALS[AuditEntityType.Game],
  ENTITY_TYPE_PLURALS[AuditEntityType.Score],
] as const;

export type AuditHistoryTab = (typeof AUDIT_HISTORY_TABS)[number];

/** An entity's audit history: the tab and the system switch. */
export const AUDIT_HISTORY_PARAMS = defineListParams({
  tab: enumParam(AUDIT_HISTORY_TABS, { default: 'self', role: 'scope' }),
  system: booleanParam({ role: 'scope' }),
});
