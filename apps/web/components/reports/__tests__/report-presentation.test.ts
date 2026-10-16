import { describe, expect, it } from 'bun:test';

import { ReportEntityType } from '@otr/core/osu';

import {
  formatReportEntityRef,
  formatReportSubject,
  getLegacySuggestedChanges,
  getReportEntityHref,
  getSuggestedChangeLabel,
} from '../report-presentation';

const reason = { key: 'something-else', label: 'Something else' };

describe('getReportEntityHref', () => {
  it('links tournaments and matches to their pages', () => {
    expect(
      getReportEntityHref({
        entityType: ReportEntityType.Tournament,
        entityId: 775,
      })
    ).toBe('/tournaments/775');
    expect(
      getReportEntityHref({
        entityType: ReportEntityType.Match,
        entityId: 134010,
      })
    ).toBe('/matches/134010');
  });

  it('opens games and scores on their match page', () => {
    expect(
      getReportEntityHref({
        entityType: ReportEntityType.Game,
        entityId: 9,
        matchId: 134010,
      })
    ).toBe('/matches/134010?gameId=9');
    expect(
      getReportEntityHref({
        entityType: ReportEntityType.Score,
        entityId: 12,
        matchId: 134010,
      })
    ).toBe('/matches/134010?scoreId=12');
  });

  it('has no link for a game or score without its match', () => {
    expect(
      getReportEntityHref({ entityType: ReportEntityType.Game, entityId: 9 })
    ).toBeNull();
    expect(
      getReportEntityHref({ entityType: ReportEntityType.Score, entityId: 12 })
    ).toBeNull();
  });
});

describe('report labels', () => {
  it('writes IDs without separators', () => {
    expect(formatReportSubject({ id: 1204 })).toBe('report #1204');
    expect(
      formatReportEntityRef({
        entityType: ReportEntityType.Score,
        entityId: 4153861,
      })
    ).toBe('Score #4153861');
  });

  it('names legacy fields by the glossary, or in sentence case', () => {
    expect(getSuggestedChangeLabel('lobbySize')).toBe('Lobby size');
    expect(getSuggestedChangeLabel('forumUrl')).toBe('Forum post URL');
    expect(getSuggestedChangeLabel('someOddField')).toBe('Some odd field');
  });
});

describe('getLegacySuggestedChanges', () => {
  it('drops a migrated entry that only repeats the reason', () => {
    expect(
      getLegacySuggestedChanges({
        reason,
        suggestedChanges: { reason: 'Something else' },
      })
    ).toEqual({});
  });

  it('keeps real suggested changes', () => {
    expect(
      getLegacySuggestedChanges({
        reason,
        suggestedChanges: { name: 'Correct name' },
      })
    ).toEqual({ name: 'Correct name' });
  });
});
