---
name: pull-request
description: Rules for opening a pull request in otr. Use whenever you open a pull request, or edit an existing pull request's title or description. Covers the title, the description template, before and after screenshots for visual changes, labels, and the signature.
---

# Opening a pull request

The reviewer judges what the software now does. They do not walk through the
code. Write for that reader.

## Title

The title follows the commit format in the root `AGENTS.md` and becomes the
release entry. Mark a breaking change to the public API or a shared contract
with `!`, as in `feat(web)!: ...`. Do not use a `BREAKING CHANGE:` footer.

## Description

- Follow `.github/pull_request_template.md`. Keep the text under 150 words in
  total, not counting the template's comments or any images.
- Describe behavior and outcomes in plain language: what a user, admin, or
  operator now sees or can do, and why. Leave out file paths, function names,
  diffs, and step-by-step implementation detail; the diff already shows those.
- Never link to files, lines, or commits. Link only to pages on the site or
  the docs.
- Under Testing, say in a sentence or two what you confirmed works. Do not
  paste commands or logs. Under Deploy risk, name any migration, data rewrite,
  or contract change, or write "None".
- `## Changelog` becomes the release notes. Use only past-tense bullets for
  user-facing changes, linking the pages they touch. Write `- None` when
  nothing user-facing changed. Keep the `<!-- changelog:end -->` marker.
  `.github/scripts/release-notes.ts` enforces the title and changelog format.
- End the description with `^claude` on its own final line, after
  `<!-- changelog:end -->`.
- Accuracy beats completeness. Never claim something was checked unless it
  was.

## Screenshots for visual changes

A pull request that changes what the site or the docs site looks like includes
before and after screenshots. The reviewer should be able to judge a pure UI
change from them, without a `preview` deployment.

1. Capture both states from your own stack (`apps/scripts/otr up`), at the
   same viewport, theme, and data. Take the before shots before you edit
   anything. If you missed them, check out `origin/master` in the worktree,
   let the dev server reload, capture them, and return to your branch.
2. Crop each shot to the area that changed, with a little surrounding context.
   Playwright, already a dev dependency of `apps/web`, crops cleanly with
   `locator.screenshot()`. Use a device scale factor of 2 so text stays sharp.
3. Add a mobile pair at 390px wide when the layout changes at phone width, and
   a dark-theme pair when colors change.
4. Join each pair into one labeled image:

   ```bash
   .claude/skills/pull-request/scripts/compare.sh before.png after.png out.png "Leaderboard filters, 390px wide"
   ```

   It labels the shots Before and After, places them side by side or stacked
   by width, and adds the optional caption that names the view.

5. Put the images in a `## Screenshots` section above `## Changelog`, one image
   per view. Keep the files out of the repository.

`gh` cannot upload images. If you cannot attach them to the pull request
yourself, send the images to the user, ask them to drop them into the
`## Screenshots` section, and say so in your final report.

## Labels

CI adds an `app:<name>` label for each app whose files the pull request
changes. Do not add them by hand. Add `preview` only when the change needs a
running site to judge, such as new behavior or data flows, and not for a
visual change the screenshots already show.
