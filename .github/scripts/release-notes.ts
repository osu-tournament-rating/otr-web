// Every merge to master ships to production as its own GitHub release.
//
// A squash merge uses the pull request title as the commit message, so titles
// are Conventional Commits headers. The pull request body carries a
// `## Changelog` of bullets ending at CHANGELOG_END, and the release body is
// the pull request link followed by those bullets. Anything after the marker,
// such as a signature, never reaches the release.
//
// A release covers master's first-parent commits since the previous release.
// A pull request merged with a merge commit, such as one that imports another
// repository's history, is its one `Merge pull request #N` commit, and the
// commits it brought in are not listed.
//
// Between the links and `## Changelog`, every release names the processor
// image it runs on one line, in exactly one of two forms:
//
//   Processor image: stagecodes/otr-processor:2026.10.09
//   Processor image: stagecodes/otr-processor:2026.10.09 (unchanged since that release)
//
// The first means this release built the image and gave it its own release
// tag. The second means apps/processor did not change, so the release runs the
// image an earlier release built, named by that release's tag. The deploy
// reads the line back: from the previous release, to learn which image an
// unchanged processor keeps, and from a redeployed release, to point `latest`
// back at its image. Releases made before the line existed have none, and the
// next deploy then builds a new image.
//
//   bun .github/scripts/release-notes.ts check
//     validates PR_TITLE and PR_BODY
//   bun .github/scripts/release-notes.ts render
//     prints notes for TARGET_SHA, since PREVIOUS_TAG or the latest release,
//     naming the processor image tagged PROCESSOR_TAG, which this release
//     built when PROCESSOR_BUILT is true and an earlier one built when false
//   bun .github/scripts/release-notes.ts processor-tag
//     prints the processor tag the release body on stdin names, or nothing
//     when it names none

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

/** The Docker Hub repository of the processor image, which production's cron runs. */
export const PROCESSOR_IMAGE = 'stagecodes/otr-processor';

/** What a release names when its processor image came from an earlier release. */
const PROCESSOR_CARRIED = ' (unchanged since that release)';

/** A release tag: `YYYY.MM.DD`, plus `.N` for a day's later releases. */
const RELEASE_TAG = /^\d{4}\.\d{2}\.\d{2}(?:\.\d+)?$/;

/** The processor line `processorLine` writes. Keep the two in step. */
const PROCESSOR_LINE =
  /^Processor image: stagecodes\/otr-processor:(?<tag>\d{4}\.\d{2}\.\d{2}(?:\.\d+)?)(?<carried> \(unchanged since that release\))?$/;

export interface Header {
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
}

const HEADER =
  /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?(?<breaking>!)?: (?<description>\S.*)$/;

/** The number GitHub appends to a squash-merged title, e.g. `(#930)`. */
const SQUASH_PULL_NUMBER = /\s*\(#(\d+)\)$/;

/** The subject of a merge commit, e.g. `Merge pull request #930 from o/branch`. */
const MERGE_PULL_NUMBER = /^Merge pull request #(\d+) from \S/;

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

/** The pull request a commit on master merged, read from its subject. */
export function pullNumber(subject: string): number | undefined {
  const match =
    SQUASH_PULL_NUMBER.exec(subject) ?? MERGE_PULL_NUMBER.exec(subject);
  return match ? Number(match[1]) : undefined;
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

export interface ProcessorImage {
  /** The release tag of the release that built the image, which is also its Docker tag. */
  tag: string;
  /** True when this release built the image, false when it runs an earlier release's. */
  built: boolean;
}

/** The release line naming the processor image, in the form the header describes. */
export function processorLine(image: ProcessorImage): string {
  if (!RELEASE_TAG.test(image.tag)) {
    throw new Error(`Not a release tag: ${JSON.stringify(image.tag)}`);
  }
  return `Processor image: ${PROCESSOR_IMAGE}:${image.tag}${image.built ? '' : PROCESSOR_CARRIED}`;
}

/**
 * The processor image a release body names, from the first line that matches
 * `processorLine` exactly. Null when no line does, as in releases made before
 * the line existed.
 */
export function parseProcessorImage(
  body: string | null
): ProcessorImage | null {
  for (const line of (body ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const groups = PROCESSOR_LINE.exec(line.trim())?.groups;
    if (groups) {
      return { tag: groups.tag, built: groups.carried === undefined };
    }
  }
  return null;
}

/**
 * The links to what shipped, the processor image when given, then the
 * changelog bullets. Changes are listed oldest first; a deploy covers more
 * than one only when merges queued up.
 */
export function renderRelease(
  changes: MergedChange[],
  processor?: ProcessorImage
): string {
  const bullets = changes.flatMap((change) => {
    const changelog = parseChangelog(change.body ?? null);
    if (changelog.errors.length > 0) {
      return [];
    }
    return changelog.lines.filter((line) => !NONE.test(line));
  });

  const links = changes.map((change) => change.url).join('\n');
  const header = processor ? `${links}\n\n${processorLine(processor)}` : links;
  const changelog = bullets.length > 0 ? bullets.join('\n') : '- None';

  return `${header}\n\n\n## Changelog\n\n${changelog}\n`;
}

/** Reads the processor image `render` names from PROCESSOR_TAG and PROCESSOR_BUILT. */
function processorFromEnv(): ProcessorImage {
  const tag = process.env.PROCESSOR_TAG;
  const built = process.env.PROCESSOR_BUILT;
  if (!tag) {
    throw new Error('PROCESSOR_TAG is not set');
  }
  if (built !== 'true' && built !== 'false') {
    throw new Error(
      `PROCESSOR_BUILT must be true or false, not ${JSON.stringify(built)}`
    );
  }
  const image = { tag, built: built === 'true' };
  // Fails on a malformed tag before anything is fetched.
  processorLine(image);
  return image;
}

async function render(
  target: string,
  processor: ProcessorImage
): Promise<string> {
  const previous =
    process.env.PREVIOUS_TAG ||
    (await $`gh release view --json tagName --jq .tagName`.text()).trim();
  const repository = (await $`gh repo view --json url --jq .url`.text()).trim();
  const log =
    await $`git log --first-parent --reverse --format=%H%x09%s ${`${previous}..${target}`}`.text();

  const changes: MergedChange[] = [];
  for (const line of log.split('\n').filter(Boolean)) {
    const [sha, subject] = line.split('\t');
    const number = pullNumber(subject);
    if (number !== undefined) {
      const body = await $`gh pr view ${number} --json body --jq .body`.text();
      changes.push({ url: `${repository}/pull/${number}`, body });
    } else {
      changes.push({ url: `${repository}/commit/${sha}` });
    }
  }

  return renderRelease(changes, processor);
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
    process.stdout.write(await render(target, processorFromEnv()));
  } else if (command === 'processor-tag') {
    const image = parseProcessorImage(await Bun.stdin.text());
    process.stdout.write(image ? `${image.tag}\n` : '');
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
