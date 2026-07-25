import { describe, expect, it } from 'bun:test';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

import {
  assembleEvents,
  camelizeChangesKeys,
  decodeEventFeedCursor,
  encodeEventFeedCursor,
  type GroupedAuditRow,
} from '../helpers';

const CREATED = '2026-07-11T20:00:00.000Z';

function groupedRow(overrides: Partial<GroupedAuditRow> = {}): GroupedAuditRow {
  return {
    eventKey: 'event:1',
    eventId: 1,
    actionUserId: 7,
    created: CREATED,
    actionTypes: [AuditActionType.Updated],
    entityType: AuditEntityType.Tournament,
    parentEntityId: 10,
    entryCount: 1,
    auditEntryCount: 1,
    verificationStatusValues: [],
    changedFields: ['name'],
    sampleChanges: {
      name: { originalValue: 'Old', newValue: 'New' },
    },
    sampleEntityId: 10,
    ...overrides,
  };
}

describe('assembleEvents', () => {
  it('keeps distinct event IDs separate even when actor and timestamp match', () => {
    const events = assembleEvents([
      groupedRow(),
      groupedRow({
        eventKey: 'event:2',
        eventId: 2,
        sampleEntityId: 11,
        parentEntityId: 11,
      }),
    ]);

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventId).sort()).toEqual([1, 2]);
  });

  it('keeps equal-timestamp legacy events from different parents separate', () => {
    const events = assembleEvents([
      groupedRow({
        eventKey: `legacy:7:${CREATED}:1:10`,
        eventId: null,
      }),
      groupedRow({
        eventKey: `legacy:7:${CREATED}:1:11`,
        eventId: null,
        parentEntityId: 11,
        sampleEntityId: 11,
      }),
    ]);

    expect(events).toHaveLength(2);
    expect(events.every((event) => event.eventId === null)).toBe(true);
  });

  it('assembles one event across the full entity hierarchy', () => {
    const rows: GroupedAuditRow[] = [
      groupedRow(),
      groupedRow({
        entityType: AuditEntityType.Match,
        entryCount: 3,
        auditEntryCount: 3,
        sampleEntityId: 20,
      }),
      groupedRow({
        entityType: AuditEntityType.Game,
        entryCount: 12,
        auditEntryCount: 12,
        sampleEntityId: 30,
      }),
      groupedRow({
        entityType: AuditEntityType.Score,
        entryCount: 48,
        auditEntryCount: 48,
        sampleEntityId: 40,
      }),
    ];

    const [event] = assembleEvents(rows);

    expect(event.isCascade).toBe(true);
    expect(event.topEntityType).toBe(AuditEntityType.Tournament);
    expect(event.topEntityCount).toBe(1);
    expect(event.childEntityType).toBe(AuditEntityType.Match);
    expect(event.childAffectedCount).toBe(3);
  });

  it('sums every top-level group and unions its changed fields', () => {
    const rows = Array.from({ length: 285 }, (_, index) =>
      groupedRow({
        entryCount: 1,
        parentEntityId: index + 1,
        sampleEntityId: index + 1,
        changedFields: index === 0 ? ['submitted_by_user_id'] : ['name'],
        sampleChanges:
          index === 0
            ? {
                submitted_by_user_id: {
                  originalValue: null,
                  newValue: 7,
                },
              }
            : {
                name: {
                  originalValue: `Old ${index}`,
                  newValue: `New ${index}`,
                },
              },
      })
    );

    const [event] = assembleEvents(rows);

    expect(event.topEntityCount).toBe(285);
    expect(event.parentEntityId).toBeNull();
    expect(event.changedFields).toEqual(['name', 'submittedByUserId']);
  });

  it('does not aggregate separate system events', () => {
    const events = assembleEvents([
      groupedRow({ eventKey: 'event:1', eventId: 1, actionUserId: null }),
      groupedRow({
        eventKey: 'event:2',
        eventId: 2,
        actionUserId: null,
        sampleEntityId: 11,
      }),
    ]);

    expect(events).toHaveLength(2);
  });

  it('uses a generic action and exposes repeated writes for mixed actions', () => {
    const [event] = assembleEvents([
      groupedRow({
        actionTypes: [AuditActionType.Created, AuditActionType.Updated],
        entryCount: 1,
        auditEntryCount: 2,
      }),
    ]);

    expect(event.action).toBe('update');
    expect(event.topEntityCount).toBe(1);
    expect(event.topEntryCount).toBe(2);
  });

  it('uses a generic action for mixed verification outcomes in one group', () => {
    const [event] = assembleEvents([
      groupedRow({ verificationStatusValues: ['3', '4'] }),
    ]);

    expect(event.action).toBe('update');
  });

  it('uses a generic action when verification and ordinary updates mix', () => {
    const [event] = assembleEvents([
      groupedRow({ verificationStatusValues: ['4', 'unchanged'] }),
    ]);

    expect(event.action).toBe('update');
  });
});

describe('audit event feed cursors', () => {
  it('round-trips the timestamp and event tie-break key', () => {
    const encoded = encodeEventFeedCursor({
      created: CREATED,
      eventKey: 'legacy:system:1:10',
    });

    expect(decodeEventFeedCursor(encoded)).toEqual({
      created: CREATED,
      eventKey: 'legacy:system:1:10',
    });
  });

  it('continues to accept legacy timestamp-only cursors', () => {
    expect(decodeEventFeedCursor(CREATED)).toEqual({
      created: CREATED,
      eventKey: null,
    });
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeEventFeedCursor('not-a-cursor')).toThrow(
      'Invalid audit event cursor'
    );
  });
});

describe('audit change key normalization', () => {
  it('normalizes legacy PascalCase and snake_case value keys', () => {
    expect(
      camelizeChangesKeys({
        VerificationStatus: {
          OriginalValue: 0,
          new_value: 4,
        },
      })
    ).toEqual({
      verificationStatus: {
        originalValue: 0,
        newValue: 4,
      },
    });
  });
});
