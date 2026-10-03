import { describe, expect, it } from 'bun:test';
import {
  CHANGELOG_END,
  checkPullRequest,
  parseChangelog,
  parseHeader,
  renderRelease,
} from './release-notes';

const body = (changelog: string) =>
  `## Summary\n\nWhy.\n\n## Changelog\n\n<!-- Guidance. -->\n\n${changelog}\n\n${CHANGELOG_END}\n\n^claude\n`;

describe('parseHeader', () => {
  it('reads type, scope, and the breaking marker', () => {
    expect(parseHeader('feat(api)!: remove stats')).toEqual({
      type: 'feat',
      scope: 'api',
      breaking: true,
      description: 'remove stats',
    });
  });

  it('rejects titles without a type', () => {
    expect(parseHeader('Fix the leaderboard')).toBeNull();
    expect(parseHeader('fix:no space')).toBeNull();
    expect(parseHeader('Fix: capitalised type')).toBeNull();
  });
});

describe('parseChangelog', () => {
  it('stops at the end marker and drops comments and blank lines', () => {
    expect(
      parseChangelog(body('- Added a.\n  - Detail.\n\n- Fixed b.'))
    ).toEqual({
      lines: ['- Added a.', '  - Detail.', '- Fixed b.'],
      errors: [],
    });
  });

  it('handles CRLF', () => {
    expect(
      parseChangelog(`## Changelog\r\n\r\n- Changed.\r\n${CHANGELOG_END}\r\n`)
        .lines
    ).toEqual(['- Changed.']);
  });

  it('requires the section and the marker', () => {
    expect(parseChangelog('## Summary\n\nWhy.').errors).toHaveLength(1);
    expect(parseChangelog(null).errors).toHaveLength(1);
    expect(parseChangelog('## Changelog\n\n- A.').errors[0]).toContain(
      CHANGELOG_END
    );
  });

  it('rejects a marker placed after another section', () => {
    expect(
      parseChangelog(
        `## Changelog\n\n- A.\n\n## Notes\n\nB.\n\n${CHANGELOG_END}`
      ).errors
    ).toHaveLength(1);
  });

  it('accepts only bullets', () => {
    expect(parseChangelog(body('Added a thing.')).errors).toHaveLength(2);
    expect(parseChangelog(body('- A.\n\nSome prose.')).errors).toHaveLength(1);
    expect(parseChangelog(body('  - Indented first.')).errors).toHaveLength(1);
    expect(parseChangelog(body('')).errors).toHaveLength(1);
  });

  it('allows None only on its own', () => {
    expect(parseChangelog(body('- None')).errors).toEqual([]);
    expect(parseChangelog(body('- None\n- Added a.')).errors).toHaveLength(1);
  });
});

describe('checkPullRequest', () => {
  it('accepts a conventional title with a changelog', () => {
    expect(checkPullRequest('fix: x', body('- Fixed x.'))).toEqual([]);
    expect(checkPullRequest('ci: x', body('- None'))).toEqual([]);
  });

  it('reports each problem', () => {
    expect(checkPullRequest('Fix x', '## Summary')).toHaveLength(2);
    expect(checkPullRequest('feature: x', body(''))).toHaveLength(2);
  });
});

describe('renderRelease', () => {
  const url = 'https://github.com/o/r/pull/1';

  it('links the pull request above its changelog', () => {
    expect(
      renderRelease([{ url, body: body('- Added a.\n  - Detail.') }])
    ).toBe(`${url}\n\n\n## Changelog\n\n- Added a.\n  - Detail.\n`);
  });

  it('combines merges that deployed together', () => {
    expect(
      renderRelease([
        { url, body: body('- Added a.') },
        { url: 'https://github.com/o/r/pull/2', body: body('- None') },
        { url: 'https://github.com/o/r/commit/abc' },
        { url: 'https://github.com/o/r/pull/3', body: body('- Fixed c.') },
      ])
    ).toBe(
      [
        url,
        'https://github.com/o/r/pull/2',
        'https://github.com/o/r/commit/abc',
        'https://github.com/o/r/pull/3',
        '',
        '',
        '## Changelog',
        '',
        '- Added a.',
        '- Fixed c.',
        '',
      ].join('\n')
    );
  });

  it('writes None when nothing is user-facing', () => {
    expect(renderRelease([{ url, body: body('- None') }])).toBe(
      `${url}\n\n\n## Changelog\n\n- None\n`
    );
  });
});
