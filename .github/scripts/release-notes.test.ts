import { describe, expect, it } from 'bun:test';
import {
  CHANGELOG_END,
  checkPullRequest,
  parseChangelog,
  parseHeader,
  parseProcessorImage,
  processorLine,
  pullNumber,
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

describe('pullNumber', () => {
  it('reads the number a squash merge appends', () => {
    expect(pullNumber('fix(ui): tooltips stay closed (#937)')).toBe(937);
    expect(pullNumber('fix: x (#12) (#34)')).toBe(34);
  });

  it('reads the number from a merge commit', () => {
    expect(
      pullNumber(
        'Merge pull request #940 from osu-tournament-rating/cc/processor-import'
      )
    ).toBe(940);
  });

  it('ignores commits that merged no pull request', () => {
    expect(pullNumber('chore: pushed directly')).toBeUndefined();
    expect(pullNumber('fix: see #12 for context')).toBeUndefined();
    expect(pullNumber("Merge branch 'master' into feature")).toBeUndefined();
    expect(
      pullNumber("Add 'apps/processor/' from commit '8c59235b'")
    ).toBeUndefined();
    expect(pullNumber('Merge pull request #940')).toBeUndefined();
    expect(pullNumber('')).toBeUndefined();
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

describe('processorLine', () => {
  it('names an image this release built', () => {
    expect(processorLine({ tag: '2026.10.09', built: true })).toBe(
      'Processor image: stagecodes/otr-processor:2026.10.09'
    );
  });

  it('marks an image an earlier release built', () => {
    expect(processorLine({ tag: '2026.10.08.1', built: false })).toBe(
      'Processor image: stagecodes/otr-processor:2026.10.08.1 (unchanged since that release)'
    );
  });

  it('accepts only release tags', () => {
    for (const tag of [
      '',
      'latest',
      'sha-7de4ed01',
      'v1.0.1',
      '2026.10.9',
      '2026.10.09.',
      '2026.10.09 ',
      '2026.10.09\nProcessor image: x',
    ]) {
      expect(() => processorLine({ tag, built: true })).toThrow();
    }
  });
});

describe('renderRelease with a processor image', () => {
  const url = 'https://github.com/o/r/pull/1';

  it('puts an image this release built between the links and the changelog', () => {
    expect(
      renderRelease([{ url, body: body('- Added a.') }], {
        tag: '2026.10.09',
        built: true,
      })
    ).toBe(
      `${url}\n\nProcessor image: stagecodes/otr-processor:2026.10.09\n\n\n## Changelog\n\n- Added a.\n`
    );
  });

  it('puts an image an earlier release built in the same place', () => {
    expect(
      renderRelease(
        [
          { url, body: body('- None') },
          { url: 'https://github.com/o/r/pull/2', body: body('- Fixed b.') },
        ],
        { tag: '2026.10.08.1', built: false }
      )
    ).toBe(
      [
        url,
        'https://github.com/o/r/pull/2',
        '',
        'Processor image: stagecodes/otr-processor:2026.10.08.1 (unchanged since that release)',
        '',
        '',
        '## Changelog',
        '',
        '- Fixed b.',
        '',
      ].join('\n')
    );
  });

  it('refuses to write a line it could not read back', () => {
    expect(() =>
      renderRelease([{ url, body: body('- None') }], {
        tag: 'latest',
        built: false,
      })
    ).toThrow();
  });
});

describe('parseProcessorImage', () => {
  const url = 'https://github.com/o/r/pull/1';

  it('reads back both forms renderRelease writes', () => {
    for (const image of [
      { tag: '2026.10.09', built: true },
      { tag: '2026.10.09.2', built: true },
      { tag: '2026.10.08.1', built: false },
    ]) {
      expect(
        parseProcessorImage(
          renderRelease([{ url, body: body('- None') }], image)
        )
      ).toEqual(image);
    }
  });

  it('finds nothing in a release made before the line existed', () => {
    // The body of release 2026.10.08.1.
    expect(
      parseProcessorImage(
        'https://github.com/osu-tournament-rating/otr-web/pull/943\n\n\n## Changelog\n\n- None\n'
      )
    ).toBeNull();
    expect(parseProcessorImage('')).toBeNull();
    expect(parseProcessorImage(null)).toBeNull();
  });

  it('reads a release edited on GitHub, which saves CRLF', () => {
    expect(
      parseProcessorImage(
        `${url}\r\n\r\nProcessor image: stagecodes/otr-processor:2026.10.09 \r\n\r\n## Changelog\r\n`
      )
    ).toEqual({ tag: '2026.10.09', built: true });
  });

  it('ignores lines that only resemble it', () => {
    for (const line of [
      '- Processor image: stagecodes/otr-processor:2026.10.09',
      'See Processor image: stagecodes/otr-processor:2026.10.09',
      'Processor image: stagecodes/otr-web:2026.10.09',
      'Processor image: stagecodes/otr-processor:latest',
      'Processor image: stagecodes/otr-processor:2026.10.09 (unchanged)',
      'processor image: stagecodes/otr-processor:2026.10.09',
      'Processor image: `stagecodes/otr-processor:2026.10.09`',
    ]) {
      expect(parseProcessorImage(`${url}\n\n${line}\n`)).toBeNull();
    }
  });

  it('takes the first line when there are several', () => {
    expect(
      parseProcessorImage(
        'Processor image: stagecodes/otr-processor:2026.10.09.1 (unchanged since that release)\nProcessor image: stagecodes/otr-processor:2026.10.09'
      )
    ).toEqual({ tag: '2026.10.09.1', built: false });
  });
});

describe('command line', () => {
  const script = `${import.meta.dir}/release-notes.ts`;

  const run = async (
    args: string[],
    env: Record<string, string>,
    stdin = ''
  ) => {
    const child = Bun.spawn([process.execPath, script, ...args], {
      env: { PATH: process.env.PATH ?? '', ...env },
      stdin: new Blob([stdin]),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, code] = await Promise.all([
      new Response(child.stdout).text(),
      child.exited,
    ]);
    return { stdout, code };
  };

  it('prints the processor tag a release body names', async () => {
    expect(
      await run(
        ['processor-tag'],
        {},
        renderRelease([{ url: 'https://github.com/o/r/pull/1' }], {
          tag: '2026.10.08.1',
          built: false,
        })
      )
    ).toEqual({ stdout: '2026.10.08.1\n', code: 0 });
  });

  it('prints nothing for a body that names no processor image', async () => {
    expect(
      await run(['processor-tag'], {}, '## Changelog\n\n- None\n')
    ).toEqual({ stdout: '', code: 0 });
  });

  it('will not render a release without its processor image', async () => {
    const envs: Record<string, string>[] = [
      {},
      { PROCESSOR_TAG: '2026.10.09' },
      { PROCESSOR_TAG: '2026.10.09', PROCESSOR_BUILT: 'yes' },
      { PROCESSOR_TAG: 'latest', PROCESSOR_BUILT: 'false' },
    ];
    for (const env of envs) {
      const result = await run(['render'], { TARGET_SHA: 'HEAD', ...env });
      expect(result.code).not.toBe(0);
      expect(result.stdout).toBe('');
    }
  });
});
