import { describe, expect, it } from 'bun:test';

import {
  defineListParams,
  getDefaultListState,
  sortParam,
  enumParam,
} from '../params';
import {
  landShallowAddress,
  shallowSearchKey,
  syncShallowState,
  writeShallowAddress,
} from '../shallow';

const params = defineListParams({
  view: enumParam(['rating', 'volatility'] as const, {
    default: 'rating',
    role: 'scope',
  }),
  sort: sortParam(['date', 'rating'], { key: 'date', direction: 'desc' }),
});

function fakeHistory() {
  const calls: [string, string][] = [];
  return {
    calls,
    pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
      calls.push(['push', String(url)]);
    },
    replaceState: (
      _data: unknown,
      _unused: string,
      url?: string | URL | null
    ) => {
      calls.push(['replace', String(url)]);
    },
  };
}

describe('writeShallowAddress', () => {
  it('adds a history entry for push and overwrites it for replace', () => {
    const history = fakeHistory();
    writeShallowAddress('/players/1?view=volatility', 'push', history);
    writeShallowAddress('/players/1', 'replace', history);

    expect(history.calls).toEqual([
      ['push', '/players/1?view=volatility'],
      ['replace', '/players/1'],
    ]);
  });
});

describe('syncShallowState', () => {
  it('follows the browser address after back or forward', () => {
    const held = getDefaultListState(params);
    expect(syncShallowState(params, held, '?view=volatility&dir=asc')).toEqual({
      view: 'volatility',
      sort: { key: 'date', direction: 'asc' },
    });
  });

  it('keeps the same object when the address already matches', () => {
    const held = {
      ...getDefaultListState(params),
      view: 'volatility' as const,
    };
    expect(syncShallowState(params, held, '?view=volatility')).toBe(held);
  });
});

describe('shallowSearchKey', () => {
  it('reads the query of an href as useSearchParams reports it', () => {
    expect(shallowSearchKey('/players/1?view=volatility&dir=asc')).toBe(
      'view=volatility&dir=asc'
    );
    expect(shallowSearchKey('/players/1')).toBe('');
    expect(shallowSearchKey('/players?q=world cup')).toBe(
      new URLSearchParams('q=world cup').toString()
    );
  });
});

describe('landShallowAddress', () => {
  it('keeps the newest state while an older write of its own lands', () => {
    expect(
      landShallowAddress(
        ['view=volatility', 'view=volatility&dir=asc'],
        'view=volatility'
      )
    ).toEqual({ own: true, pending: ['view=volatility&dir=asc'] });
  });

  it('settles once its newest write lands, even when older ones were skipped', () => {
    expect(
      landShallowAddress(
        ['view=volatility', 'view=volatility&dir=asc'],
        'view=volatility&dir=asc'
      )
    ).toEqual({ own: true, pending: [] });
  });

  it('follows any other change, such as back, a link or router.push', () => {
    expect(landShallowAddress([], 'view=volatility')).toEqual({
      own: false,
      pending: [],
    });
    expect(landShallowAddress(['view=volatility'], '')).toEqual({
      own: false,
      pending: [],
    });
  });
});
