This page records changes to the [otr-web](https://github.com/osu-tournament-rating/otr-web) project. Changelog format is based on [keep a changelog](https://keepachangelog.com/en/1.1.0/).

> [!note]
> This changelog began tracking releases on 2026.08.16. Changes made before that date are not recorded on this page.

## Unreleased

### Breaking API Changes

- `GET /users/{id}` returns only the user ID and the linked player's ID, osu! ID, username, and country. It no longer returns account settings, scopes, or activity times.

### Added

- Added a `Submitted` entry to the audit page of tournaments submitted before October 2025, when submissions were not yet audited. It shows the submitter and submission time recorded on the tournament.
    - `GET /audit/timeline` returns them as `unauditedSubmission`.
- Updated deletion entries in audit logs to no longer list every field of the deleted entity.
- Updated verified entries on audit pages to start collapsed.

### Fixed

- Fixed signed-in users being able to change the player linked to their account.
- Fixed tournament submissions accepting any number of match and beatmap IDs. A submission accepts at most 1,000 of each, and the submission form shows the error under the field.
- Fixed incorrect next sub-tier targets in player statistics, leaderboard, and search API responses.
- Fixed API responses reporting higher Bronze sub-tiers than rating charts for some players. Bronze II now starts at 200 TR instead of about 133 TR, and Bronze I at 300 TR instead of about 267 TR.
- Fixed `topPerformers[].accuracy` in the `GET /beatmaps/{id}/stats` schema to use a fraction from 0 to 1 instead of a percentage from 0 to 100.
- Fixed matches deleted from a tournament disappearing from the tournament's audit page, along with their history. The `Matches` tab now lists a deleted match's history, ending with its deletion.
    - `GET /audit/descendants` and `GET /audit/descendant-counts` include these matches.
    - Matches deleted before October 2025 are not included, because their deletions did not record a tournament.
- Fixed deleted matches showing only their ID in audit logs. They now show the name recorded when they were deleted.

### Other

- Improved release and preview image builds to continue when exporting the build cache fails.
- Changed failed data worker messages to retry after 30 seconds, up to 5 attempts, and then move to a `<queue>.failed` parking queue. Before, a message that always failed stalled its queue.
- Changed internal service ports to listen on loopback only.
- Removed the unused authentication callback page.

## [2026.09.01](https://github.com/osu-tournament-rating/otr-web/compare/2026.08.16...2026.09.01)

### Added

- Added child audit logs to tournament, match, game, and score audit pages, showing changes recorded against an entity's children.
    - Added `GET /audit/descendants` and `GET /audit/descendant-counts`.
- Added the ability for admins to fill in data for beatmaps the osu! API no longer serves.
    - Editable fields:
        - Difficulty name, artist, and title.
        - Set owner and mappers.
        - Ruleset, star rating, BPM, length, and drain length.
        - CS, HP, OD, and AR. CS represents key count in osu!mania.
        - Circle, slider, and spinner counts, and max combo.
    - Labeled beatmaps edited this way `Manually configured`.
    - Stopped the osu! API from overwriting beatmaps edited this way.
    - Audits are recorded at `/audit/beatmaps/{id}`.
- Added support for tracing oRPC procedures through to database queries using Tempo.
- Updated the leaderboard first-visit notice to a single sentence that can be dismissed immediately.
- Added sticky column headers to tables across the site.
    - [Leaderboard](https://otr.stagec.net/leaderboard), [tournaments list](https://otr.stagec.net/tournaments), and [beatmap list](https://otr.stagec.net/beatmaps).
    - Tournament match list and ratings tab.
    - Player rating history and per-tournament match tables.
    - Beatmap score leaderboard and pooled tournaments dialog.
    - Filter report results.
    - [`/reports`](https://otr.stagec.net/reports) and [`/admin/reports`](https://otr.stagec.net/admin/reports).
- Added site-wide search matching on osu! usernames a player no longer holds.
    - A result matched through a former username shows `formerly <name>`.
- Added a setting on the [settings page](https://otr.stagec.net/settings) to turn off the `Ctrl+L` shortcut that switches between the light and dark themes.
- Added separate raw score and score override fields to the admin score editor.
    - Admins may now set a 'score override'. Previously, overriding a score was a permanent change to the score object. Now, the original API value is always kept in-tact alongside the override.
    - Re-fetching a match no longer wipes an admin's score override.
    - Automated modifications to scores, such as EZ's 1.75x adjustment, are now stored in a new field `adjustedScore`. This way, automatic/expected and manual score overrides are maintained separately *and* the original API data is preserved.
    - Previous automatic adjustments have been identified and mapped to the `adjustedScore` column.
    - Easy scores keep the original osu! total alongside the 1.75x adjusted value, which previously replaced it.
    - Match API responses now include `rawScore`, `adjustedScore`, and `scoreOverride` alongside `score`.
- Added a choice of what happens to a tournament's, match's, or game's children when an admin sets it to verified: verify all children, accept pre-verification statuses, or leave children unchanged.
    - Setting a parent to verified no longer verifies its children on its own.
    - Setting a parent to rejected still rejects all of its children.
- Disabled verifying a match, game, or score whose parent is rejected.
- Redesigned the tournament page match list.
    - Matches are grouped by weekend, with each group's dates in its header.
    - Each match row shows its scoreline, winning team first.
    - Every game shows a verification pip, even on large matches.

### Fixed

- Fixed the results header not staying pinned while scrolling on the [registrant filtering tool](https://otr.stagec.net/tools/filter).
- Fixed matches with no start time being listed under the current date on the tournament page. They now appear in a `No start time` group at the end of the match list.
- Fixed Easy scores in osu!lazer matches being stored without the 1.75x multiplier.
- Fixed the profile avatar's report notification dot not clearing while viewing reports on [`/admin/reports`](https://otr.stagec.net/admin/reports) or [`/reports`](https://otr.stagec.net/reports).
- Fixed audit logs labeling automated verifications and rejections as pre-verified and pre-rejected.
- Fixed tooltip text contrast in the light theme.
- Fixed match dates on the tournament page showing in local time instead of UTC on narrow screens.
- Fixed audit cascade banners showing mismatched counts, such as `993 of 8 games`.
- Fixed audit log cards for bulk verification describing an entire cascade by its top-level action. A card that verified a tournament and rejected some of its matches now names each outcome and its count.
- Fixed verification statuses in audit log changes always reading as a red original value and a green new value. Each status is now colored by its own meaning.
- Refined the logic behind the `Accept pre-verification statuses` action. Functionally, it behaves the same as before, just in a more predictable way.
    - A pre-rejected tournament now rejects all of its matches, games, and scores.
    - Scores rejected because their game was rejected now carry the `Rejected game` reason instead of no reason.
- Fixed the admin score editor running off the edge of the screen on phones when a score had mods, cutting off the `Mods` field and the `Save` button.
- Fixed the note explaining the 1.75x Easy multiplier never appearing on a player's Mod Performance chart.

### Other

- Added per-pull-request preview deployments served on private tailnet URLs.
- Added `OTEL_EXPORTER_OTLP_ENDPOINT` to the `.env` format.

## [2026.08.16](https://github.com/osu-tournament-rating/otr-web/compare/2026.06.16...2026.08.16)

### Breaking API Changes

- Removed `GET /beatmaps/{beatmapId}/tournaments/{tournamentId}/matches`.

### Added

- Complete overhaul of all beatmap pages and cards.
    - Redesigned beatmap overview / core information display.
    - Redesigned mod distribution, tournament activity, and tournament usage charts.
    - Redesigned beatmap score leaderboard, now shows top 25 instead of top 10.
    - Added charts to display distributions for grades, rank ranges, freemod-specific mod choices.
    - Added charts to display scores earned by tier and rank range.
    - Added chart to display accuracy earned by tier.
    - Added histogram to display how close games usually are compared to other beatmaps of the same ruleset and team size.
    - Added miss count histogram.
- Added the ability for users to view data reports they've created.
- Added "Awaiting review" pill on the tournaments landing page for unverified tournaments.
- Added a mechanism for audit logs to precisely know which entities were edited through the same admin action.
- Redesigned the beatmap audio preview panel.
- Redesigned tournament landing page.
- Redesigned the data report experience for tournaments, matches, games, and scores.
- Redesigned the match page's stats tab.
- Updated the site-wide rating distribution chart design.
- Updated API spec implementation.
- Updated Grafana monitoring dashboards.
- Updated audit logging logic to automatically handle changes in data models.
- Updated the weekly maintenance window to end automatically once new ratings for the week are detected.
- Improved tournament and beatmap search/filter interfaces.
- Improved handling of sparse keywords in site-wide search.
- Improved beatmap search ranking.
- Replaced ruleset icons with official designs, except for Mania 4K and 7K. The latter were updated to be more in-line with the official icons.
- Disabled registrant filtering during the weekly maintenance window to guarantee auditability.

### Fixed

- Restored missing submitter data for 285 tournaments.
- Fixed bugs with site-wide search that caused some results, like [w/WWW](https://otr.stagec.net/beatmaps/2855311), to not show up.
- Fixed a bug where lazer-specific fields were missing from audit logs.

### Other

- Updated packages.
- Updated the `.env` format to accept port overrides for the website and Grafana.
- Dusted cobwebs throughout the codebase.

## Full Changelogs

- [2026.09.01](https://github.com/osu-tournament-rating/otr-web/compare/2026.08.16...2026.09.01)
- [2026.08.16](https://github.com/osu-tournament-rating/otr-web/compare/2026.06.16...2026.08.16)
