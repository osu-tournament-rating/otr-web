# otr-docs agent guidance

The docs live in `apps/docs` of otr-web. Run commands from `apps/docs` unless
noted. Pull requests follow the root `AGENTS.md`.

- `docs/` is the authored source of truth. Quartz renders it. Do not edit
  `quartz/` or its submodule reference unless the task is a Quartz change.
- The root `.gitmodules` points `quartz/` at the `quartz/v4` branch of the
  otr-docs repository. From the repository root,
  `git submodule update --init apps/docs/quartz` checks it out.
- Do not commit Obsidian workspace state or editor settings.
- Link to information maintained elsewhere in otr-web or in another o!TR
  repository instead of duplicating it.

## Commands

- `npx markdownlint-cli2@0.17.2 '*.md'` matches CI. Through
  `.markdownlint-cli2.yaml`, it also lints every file under `docs/`.
- `docker build -t otr-docs:local . && docker run --rm -p 8080:8080 otr-docs:local`
  serves the site at `http://localhost:8080` and needs the Quartz submodule.
  Inspect rendered links, callouts, headings, code blocks, and navigation when
  presentation can change.

## Authoring

Before every documentation change, read the surrounding document and
`docs/Development/Docs/Style Guide.md`. After every change, compare all changed
documents against the Style Guide and verify their layout and formatting.
Write concise, searchable third-person guidance for the reader's task. Extend
the document that owns the topic; create a page only for a distinct navigation
destination. Preserve `[[wikilinks]]` and callouts such as
`[!note]`.

Processor changelog entries go under `## Unreleased` in
`Processor Changelog.md`, in the format of the `2026.08.16` release in
`Website Changelog.md`. Never add a version or date. Name a changelog branch
`changelog/<repo>-<pr>`.

Every otr-web merge ships as its own GitHub release, whose body is the merged
pull request's `## Changelog` bullets. Do not add website entries per pull
request. Every two weeks, alongside the Discord announcement, those releases
are collected into one `Website Changelog.md` section in the same format. Its
heading is the latest release tag, compare-linked from the previous section's
tag, and the release is added to Full Changelogs. Name that branch
`changelog/otr-web-<tag>`.
