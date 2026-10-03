import { describe, expect, it } from 'bun:test';
import {
  checkPullRequest,
  extractReleaseNotes,
  parseHeader,
  renderRelease,
} from './release-notes';

const body = (notes: string) =>
  `## Summary\n\nWhy.\n\n## Release notes\n\n<!-- Guidance. -->\n\n${notes}\n\n## Verification\n\n- bun test\n`;

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

describe('extractReleaseNotes', () => {
  it('stops at the next section and drops comments', () => {
    expect(extractReleaseNotes(body('- Added a thing.\n  - Detail.'))).toBe(
      '- Added a thing.\n  - Detail.'
    );
  });

  it('keeps subheadings and handles CRLF', () => {
    expect(
      extractReleaseNotes('## Release notes\r\n\r\n### API\r\n\r\n- Changed.')
    ).toBe('### API\n\n- Changed.');
  });

  it('is null without the section', () => {
    expect(extractReleaseNotes('## Summary\n\nWhy.')).toBeNull();
    expect(extractReleaseNotes(null)).toBeNull();
  });
});

describe('checkPullRequest', () => {
  it('accepts a conventional title with notes or None', () => {
    expect(checkPullRequest('fix: x', body('- Fixed x.'))).toEqual([]);
    expect(checkPullRequest('ci: x', body('None'))).toEqual([]);
  });

  it('reports each problem', () => {
    expect(checkPullRequest('Fix x', '## Summary')).toHaveLength(2);
    expect(checkPullRequest('feature: x', body(''))).toHaveLength(2);
  });
});

describe('renderRelease', () => {
  it('groups notes by type and lists every merge', () => {
    const notes = renderRelease([
      { sha: 'a'.repeat(40), subject: 'fix: b (#2)', body: body('- Fixed b.') },
      { sha: 'b'.repeat(40), subject: 'ci: c (#3)', body: body('None') },
      {
        sha: 'c'.repeat(40),
        subject: 'feat: a (#1)',
        body: body('- Added a.'),
      },
      {
        sha: 'd'.repeat(40),
        subject: 'feat(api)!: d (#4)',
        body: body('- Removed d.'),
      },
      { sha: 'e'.repeat(40), subject: 'direct push' },
    ]);

    expect(notes).toBe(
      [
        '### Breaking changes',
        '',
        '- Removed d.',
        '',
        '### Added',
        '',
        '- Added a.',
        '',
        '### Fixed',
        '',
        '- Fixed b.',
        '',
        '### Merged',
        '',
        '- fix: b (#2)',
        '- ci: c (#3)',
        '- feat: a (#1)',
        '- feat(api)!: d (#4)',
        '- direct push (eeeeeee)',
        '',
      ].join('\n')
    );
  });

  it('says so when nothing is user-facing', () => {
    expect(
      renderRelease([
        { sha: 'a'.repeat(40), subject: 'ci: a (#1)', body: body('None') },
      ])
    ).toStartWith('No user-facing changes.\n\n### Merged');
  });
});
