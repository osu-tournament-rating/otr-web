# otr-docs agent guidance

The docs live in `apps/docs` of otr. Run commands from `apps/docs` unless
noted. Pull requests follow the root `AGENTS.md`.

- `docs/` is the authored source of truth. Quartz renders it.
- The `Dockerfile` fetches Quartz's v5 branch at the commit in `QUARTZ_REF`
  and never patches it. Our changes go on top: `quartz.config.yaml`, the
  footer plugin in `plugins/otr-footer`, and the icon and link-preview image
  in `static/`. Change a Quartz behavior through those files, not by forking
  Quartz.
- To update Quartz, change `QUARTZ_REF` to a newer v5 commit. If Quartz's
  `quartz.config.default.yaml` changed in between, carry the change into
  `quartz.config.yaml`. Then build the image and look over the site.
- Page URLs are lowercase and hyphenated, so `Rating Framework/Rating FAQ.md`
  is served at `/rating-framework/rating-faq`. Link to that form. The
  capitalized Quartz 4 URL only redirects, and the redirect drops any
  `#heading`.
- Do not commit Obsidian workspace state or editor settings.
- Link to information maintained elsewhere in otr or in another o!TR
  repository instead of duplicating it.

## Commands

- `npx markdownlint-cli2@0.17.2 '*.md'` matches CI. Through
  `.markdownlint-cli2.yaml`, it also lints every file under `docs/`.
- `docker build -t otr-docs:local . && docker run --rm -p 8080:8080 otr-docs:local`
  builds the site and serves it at `http://localhost:8080`. A page Quartz
  cannot render fails the build. Inspect rendered links, callouts, headings,
  code blocks, and navigation when presentation can change.

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

Every otr merge ships as its own GitHub release, whose body is the merged
pull request's `## Changelog` bullets. Do not add website entries per pull
request. Every two weeks, alongside the Discord announcement, those releases
are collected into one `Website Changelog.md` section in the same format. Its
heading is the latest release tag, compare-linked from the previous section's
tag, and the release is added to Full Changelogs. Name that branch
`changelog/otr-<tag>`.
