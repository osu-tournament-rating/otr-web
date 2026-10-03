// Every merge to master ships to production as its own GitHub release.
//
// A squash merge uses the pull request title as the commit message, so titles
// are Conventional Commits headers. The pull request body carries a
// `## Changelog` of bullets ending at CHANGELOG_END, and the release body is
// the pull request link followed by those bullets. Anything after the marker,
// such as a signature, never reaches the release.
//
//   bun .github/scripts/release-notes.ts check   validates PR_TITLE and PR_BODY
//   bun .github/scripts/release-notes.ts render  prints notes for TARGET_SHA,
//                                                 since PREVIOUS_TAG or the
//                                                 latest release

import { $ } from 'bun';

export const TYPES = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'test',
  'build',
  'ci',
  'chore',
  'style',
  'revert',
] as const;

export const CHANGELOG_END = '<!-- changelog:end -->';

export interface Header {
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
}

const HEADER =
  /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?(?<breaking>!)?: (?<description>\S.*)$/;

/** The number GitHub appends to a squash-merged title, e.g. `(#930)`. */
const PULL_NUMBER = /\s*\(#(\d+)\)$/;

const BULLET = /^\s*[-*] \S/;
const TOP_LEVEL_BULLET = /^[-*] \S/;
const NONE = /^[-*] none\.?$/i;

export function parseHeader(title: string): Header | null {
  const groups = HEADER.exec(title.trim())?.groups;
  if (!groups) {
    return null;
  }

  return {
    type: groups.type,
    scope: groups.scope,
    breaking: groups.breaking === '!',
    description: groups.description,
  };
}

export interface Changelog {
  /** Bullet lines as written, without comments or blank lines. */
  lines: string[];
  errors: string[];
}

/** Reads the bullets between `## Changelog` and CHANGELOG_END. */
export function parseChangelog(body: string | null): Changelog {
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n');

  const start = lines.findIndex((line) =>
    /^##\s+changelog\s*$/i.test(line.trim())
  );
  if (start === -1) {
    return {
      lines: [],
      errors: ['The description needs a `## Changelog` section.'],
    };
  }

  const length = lines
    .slice(start + 1)
    .findIndex((line) => line.trim() === CHANGELOG_END);
  if (length === -1) {
    return {
      lines: [],
      errors: [
        `The changelog must end with \`${CHANGELOG_END}\` on its own line.`,
      ],
    };
  }

  const section = lines.slice(start + 1, start + 1 + length);
  if (section.some((line) => /^#{1,2}\s/.test(line))) {
    return {
      lines: [],
      errors: [
        `Another section starts before \`${CHANGELOG_END}\`. Keep the marker directly after the changelog bullets.`,
      ],
    };
  }

  const bullets = section
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => line.trim() !== '');

  const errors: string[] = [];
  if (bullets.length === 0) {
    errors.push(
      'The changelog is empty. Write `- None` if nothing user-facing changed.'
    );
  } else if (!TOP_LEVEL_BULLET.test(bullets[0])) {
    errors.push('The changelog must start with a top-level bullet.');
  }

  const loose = bullets.filter((line) => !BULLET.test(line));
  if (loose.length > 0) {
    errors.push(
      `Every changelog line must be a bullet. Not a bullet: ${loose
        .map((line) => `\`${line.trim()}\``)
        .join(', ')}`
    );
  }

  if (bullets.length > 1 && bullets.some((line) => NONE.test(line))) {
    errors.push('`- None` must be the only changelog bullet.');
  }

  return { lines: bullets, errors };
}

export function checkPullRequest(title: string, body: string | null): string[] {
  const errors: string[] = [];

  const header = parseHeader(title);
  if (!header) {
    errors.push(
      'The title must be a Conventional Commits header, such as `fix: leaderboard keeps its filters` or `feat(api)!: remove GET /players/{id}/stats`.'
    );
  } else if (!(TYPES as readonly string[]).includes(header.type)) {
    errors.push(
      `\`${header.type}\` is not a commit type. Use one of: ${TYPES.join(', ')}.`
    );
  }

  return [...errors, ...parseChangelog(body).errors];
}

export interface MergedChange {
  /** The pull request, or the commit when it was pushed directly. */
  url: string;
  /** The pull request description; absent for a direct push. */
  body?: string | null;
}

/**
 * The links to what shipped, then the changelog bullets. Changes are listed
 * oldest first; a deploy covers more than one only when merges queued up.
 */
export function renderRelease(changes: MergedChange[]): string {
  const bullets = changes.flatMap((change) => {
    const changelog = parseChangelog(change.body ?? null);
    if (changelog.errors.length > 0) {
      return [];
    }
    return changelog.lines.filter((line) => !NONE.test(line));
  });

  const links = changes.map((change) => change.url).join('\n');
  const changelog = bullets.length > 0 ? bullets.join('\n') : '- None';

  return `${links}\n\n\n## Changelog\n\n${changelog}\n`;
}

async function render(target: string): Promise<string> {
  const previous =
    process.env.PREVIOUS_TAG ||
    (await $`gh release view --json tagName --jq .tagName`.text()).trim();
  const repository = (await $`gh repo view --json url --jq .url`.text()).trim();
  const log =
    await $`git log --reverse --format=%H%x09%s ${`${previous}..${target}`}`.text();

  const changes: MergedChange[] = [];
  for (const line of log.split('\n').filter(Boolean)) {
    const [sha, subject] = line.split('\t');
    const number = PULL_NUMBER.exec(subject)?.[1];
    if (number) {
      const body = await $`gh pr view ${number} --json body --jq .body`.text();
      changes.push({ url: `${repository}/pull/${number}`, body });
    } else {
      changes.push({ url: `${repository}/commit/${sha}` });
    }
  }

  return renderRelease(changes);
}

if (import.meta.main) {
  const command = Bun.argv[2];

  if (command === 'check') {
    const errors = checkPullRequest(
      process.env.PR_TITLE ?? '',
      process.env.PR_BODY ?? ''
    );
    for (const error of errors) {
      console.log(`::error::${error}`);
    }
    process.exit(errors.length === 0 ? 0 : 1);
  } else if (command === 'render') {
    const target = process.env.TARGET_SHA;
    if (!target) {
      throw new Error('TARGET_SHA is not set');
    }
    process.stdout.write(await render(target));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
