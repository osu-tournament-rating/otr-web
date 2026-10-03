// Every merge to master ships to production as its own GitHub release.
//
// A squash merge uses the pull request title as the commit message, so titles
// are Conventional Commits headers. The pull request body carries a
// `## Release notes` section, which becomes the release body once it ships.
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

/**
 * The text under `## Release notes`, without template comments. Null when the
 * body has no such section.
 */
export function extractReleaseNotes(body: string | null): string | null {
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) =>
    /^##\s+release notes\s*$/i.test(line.trim())
  );
  if (start === -1) {
    return null;
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2}\s/.test(line));
  const section = (end === -1 ? rest : rest.slice(0, end)).join('\n');

  return section.replace(/<!--[\s\S]*?-->/g, '').trim();
}

export function isNone(notes: string): boolean {
  return /^_?none\.?_?$/i.test(notes.trim());
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

  const notes = extractReleaseNotes(body);
  if (notes === null) {
    errors.push('The description needs a `## Release notes` section.');
  } else if (notes === '') {
    errors.push(
      'The `## Release notes` section is empty. Write `None` if nothing user-facing changed.'
    );
  }

  return errors;
}

export interface MergedChange {
  /** The squash commit subject, e.g. `fix: lookup is public (#928)`. */
  subject: string;
  sha: string;
  /** Present when the commit came from a pull request. */
  body?: string | null;
}

const SECTIONS = ['Breaking changes', 'Added', 'Fixed', 'Changed'] as const;

function sectionOf(header: Header | null): (typeof SECTIONS)[number] {
  if (header?.breaking) {
    return 'Breaking changes';
  }
  if (header?.type === 'feat') {
    return 'Added';
  }
  if (header?.type === 'fix') {
    return 'Fixed';
  }
  return 'Changed';
}

/** Changes are listed oldest first. */
export function renderRelease(changes: MergedChange[]): string {
  const sections = new Map<string, string[]>();

  for (const change of changes) {
    const notes = extractReleaseNotes(change.body ?? null);
    if (!notes || isNone(notes)) {
      continue;
    }

    const title = change.subject.replace(PULL_NUMBER, '');
    const section = sectionOf(parseHeader(title));
    sections.set(section, [...(sections.get(section) ?? []), notes]);
  }

  const parts: string[] = [];
  for (const section of SECTIONS) {
    const notes = sections.get(section);
    if (notes) {
      parts.push(`### ${section}\n\n${notes.join('\n\n')}`);
    }
  }

  if (parts.length === 0) {
    parts.push('No user-facing changes.');
  }

  const merged = changes.map((change) =>
    PULL_NUMBER.test(change.subject)
      ? `- ${change.subject}`
      : `- ${change.subject} (${change.sha.slice(0, 7)})`
  );
  if (merged.length > 0) {
    parts.push(`### Merged\n\n${merged.join('\n')}`);
  }

  return `${parts.join('\n\n')}\n`;
}

async function render(target: string): Promise<string> {
  const previous =
    process.env.PREVIOUS_TAG ||
    (await $`gh release view --json tagName --jq .tagName`.text()).trim();
  const log =
    await $`git log --reverse --format=%H%x09%s ${`${previous}..${target}`}`.text();

  const changes: MergedChange[] = [];
  for (const line of log.split('\n').filter(Boolean)) {
    const [sha, subject] = line.split('\t');
    const number = PULL_NUMBER.exec(subject)?.[1];
    const body = number
      ? (await $`gh pr view ${number} --json body --jq .body`.text()).trim()
      : undefined;
    changes.push({ sha, subject, body });
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
