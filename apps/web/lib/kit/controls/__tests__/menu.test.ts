import { describe, expect, it } from 'bun:test';

import { groupMenuActions } from '@/lib/kit/controls/menu';

type Action = {
  label: string;
  group?: string;
  destructive?: boolean;
  hidden?: boolean;
};

const labels = (groups: Action[][]) =>
  groups.map((group) => group.map((action) => action.label));

describe('groupMenuActions', () => {
  it('keeps ungrouped actions together in their order', () => {
    const groups = groupMenuActions<Action>([
      { label: 'Edit tournament' },
      { label: 'Admin notes' },
      { label: 'Audit history' },
    ]);

    expect(labels(groups)).toEqual([
      ['Edit tournament', 'Admin notes', 'Audit history'],
    ]);
  });

  it('orders groups by first appearance', () => {
    const groups = groupMenuActions<Action>([
      { label: 'Edit tournament', group: 'edit' },
      { label: 'Refetch match data', group: 'data' },
      { label: 'Admin notes', group: 'edit' },
      { label: 'Refetch beatmap data', group: 'data' },
      { label: 'Audit history' },
    ]);

    expect(labels(groups)).toEqual([
      ['Edit tournament', 'Admin notes'],
      ['Refetch match data', 'Refetch beatmap data'],
      ['Audit history'],
    ]);
  });

  it('moves destructive actions into one last group', () => {
    const groups = groupMenuActions<Action>([
      { label: 'Delete tournament', destructive: true },
      { label: 'Edit tournament', group: 'edit' },
      { label: 'Delete pooled beatmaps', group: 'data', destructive: true },
      { label: 'Refetch match data', group: 'data' },
    ]);

    expect(labels(groups)).toEqual([
      ['Edit tournament'],
      ['Refetch match data'],
      ['Delete tournament', 'Delete pooled beatmaps'],
    ]);
  });

  it('drops hidden and falsy entries and empty groups', () => {
    const isLazer = false;
    const groups = groupMenuActions<Action>([
      { label: 'Edit match' },
      isLazer && { label: 'Open lobby on osu!' },
      null,
      undefined,
      { label: 'Merge matches', group: 'data', hidden: true },
      { label: 'Delete match', destructive: true, hidden: true },
    ]);

    expect(labels(groups)).toEqual([['Edit match']]);
  });

  it('returns no groups for no actions', () => {
    expect(groupMenuActions<Action>([])).toEqual([]);
    expect(groupMenuActions<Action>([{ label: 'x', hidden: true }])).toEqual(
      []
    );
  });
});
