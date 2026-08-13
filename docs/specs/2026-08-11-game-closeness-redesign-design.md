# Game closeness chart redesign — design spec

Date: 2026-08-11
Branch context: `feature/beatmap-redesign`
Surface: `BeatmapMarginCard` on `/beatmaps/[id]`, backed by `getBeatmapStats`.

This spec replaces the "Game closeness" card's metric, its storage, and its public
API shape. It is a statistics correction, not a visual refresh: the current card
answers a different question from the one it claims to answer, and it answers it
on a scale that is not comparable between rulesets or team sizes.

Section 3.2 records the page-wide verification policy: usage credit covers real
tournament play, analysis covers only verified games. An audit found no statistic
violating it. That section's labelling and usage-credit work shipped on
2026-08-11, ahead of the closeness rebuild described here.

## 1. What exists today

`apps/web/app/server/oRPC/procedures/beatmapProcedures.ts:138-166` builds a
per-game relative margin for verified `TeamVs` games with exactly two rosters:

```
margin_pct = (MAX(roster.score) - MIN(roster.score)) / NULLIF(MAX(roster.score), 0) * 100
```

`apps/web/app/server/oRPC/procedures/beatmapStatsHelpers.ts:205-217` bins it into
seven fixed buckets — `0–1`, `1–2.5`, `2.5–5`, `5–10`, `10–20`, `20–40`, `40%+` —
and the procedure adds a median. `BeatmapMarginCard.tsx` renders the buckets as
equal-width bars under the caption _"Left-heavy = coinflip map, right-heavy =
stomps."_

The bin _geometry_ is defensible: above 1% the edges are log-spaced base-2, so
equal-width bars do not distort density. Everything else needs to change.

## 2. Evidence

All figures below come from the local `otr-db` database on 2026-08-11, read-only.
It carries the full production dataset, not a subset. Unless stated otherwise,
figures cover verified tournaments + matches + games (`verification_status = 4` at
each level), `team_type = 2`, exactly two roster rows per game.

The fitted constants must be refit at implementation time; they are sized to
justify the design, not to be hard-coded.

### 2.1 Score margin barely tracks how one-sided a game was

osu! 1v1, bucketed by pre-game rating gap (`rating_adjustments.rating_before`):

| Rating gap | Games  | Upset rate | Median margin |
| ---------- | ------ | ---------- | ------------- |
| 0–25       | 28,775 | 49.5%      | 29.99%        |
| 25–50      | 27,762 | 48.0%      | 30.10%        |
| 50–100     | 52,299 | 46.1%      | 30.15%        |
| 100–200    | 86,006 | 42.4%      | 30.29%        |
| 200–400    | 96,040 | 35.6%      | 31.31%        |
| 400+       | 53,767 | 23.3%      | 36.52%        |

Upset rate halves across the range. Median margin moves 1.3 points. Two dead-even
players still finish about 30% apart, because scores are volatile — one player
chokes a section, the other does not.

The same holds in every other ruleset (1v1, gap `<50` vs gap `>=400`):

| Ruleset  | Games  | Upset rate, gap<50 | Upset rate, gap>=400 | Median margin, gap<50 | Median margin, gap>=400 |
| -------- | ------ | ------------------ | -------------------- | --------------------- | ----------------------- |
| mania 4K | 46,386 | 48.1%              | 20.5%                | 1.21%                 | 1.47%                   |
| taiko    | 32,771 | 49.3%              | 19.8%                | 5.66%                 | 6.72%                   |
| catch    | 27,577 | 48.6%              | 19.6%                | 8.26%                 | 12.09%                  |
| mania 7K | 6,153  | 47.8%              | 14.2%                | 2.64%                 | 4.00%                   |

Directly: `corr(rating_gap, ln(W/L)) = 0.104` over 344,649 osu! 1v1 games, so the
gap explains **1.1%** of the variance.

Consequence for the design: the caption's claim is unsupported, and the metric
does **not** need to join `rating_adjustments`. Score spread and competitive
one-sidedness are close to orthogonal here.

### 2.2 Fixed percentage bins are not comparable across cohorts

By ruleset (all team sizes; every cohort with meaningful volume is
`scoring_type = 3`, ScoreV2, so there is no V1/V2 confound to model):

| Ruleset  | Games   | Median margin | p90 margin | % in first bin (0–1) | % in last bin (40+) |
| -------- | ------- | ------------- | ---------- | -------------------- | ------------------- |
| osu!     | 757,245 | 24.78%        | 57.29%     | 2.1%                 | 26.4%               |
| mania 4K | 63,576  | 1.14%         | 7.19%      | 46.3%                | 1.1%                |
| taiko    | 57,313  | 4.59%         | 21.25%     | 14.8%                | 3.3%                |
| catch    | 42,432  | 7.07%         | 24.34%     | 10.2%                | 3.1%                |
| mania 7K | 8,737   | 2.37%         | 11.02%     | 25.9%                | 1.0%                |

A 20x spread in central tendency. The same seven bins render as a spike on the
left for mania 4K and a wall on the right for osu!, entirely from scoring systems.

By team size (team score is a sum, so relative spread compresses roughly as
`1/sqrt(n)`):

| Team size | Games   | Roster-size mismatch | Loser scored 0 | Median margin | p90 margin |
| --------- | ------- | -------------------- | -------------- | ------------- | ---------- |
| 1         | 457,536 | 0                    | 0              | 22.77%        | 61.07%     |
| 2         | 265,864 | 0                    | 0              | 20.49%        | 50.63%     |
| 3         | 110,158 | 14                   | 0              | 14.27%        | 41.12%     |
| 4         | 94,667  | 8                    | 0              | 15.78%        | 37.44%     |
| 5         | 452     | 6                    | 0              | 13.14%        | 30.19%     |
| 8         | 626     | 0                    | 0              | 13.52%        | 35.00%     |

Rank range adds a smaller, monotone effect (osu!, all team sizes): median margin
25.99% at open rank, 21.19% for 2–999, rising back to 26.10% for 50,000–250,000.
The share landing in the open-ended `40%+` bin moves from 19.4% to 29.0% across
those bands.

### 2.3 The beatmap explains about 8% of it, and the data is sparse

One-way variance decomposition of `ln(W/L)`, osu! 1v1, 4,778 maps with n >= 20
(169,650 games, mean n = 35.5):

- within-map variance `sigma^2 = 0.1965`
- observed between-map variance of map means `= 0.0228`
- sampling-noise component `= 0.0055`
- **true between-map variance `tau^2 = 0.0173`** → **ICC = 0.081**
- shrinkage constant **`k = sigma^2 / tau^2 = 11.4 games`**

`tau = 0.132` in log units, so a one-SD "stompy" map produces a winner/loser score
ratio about 14% larger than an average map. Real, but modest.

Sparsity over the whole verified closeness population — 78,800 beatmaps,
929,303 games:

| Games on the map | Beatmaps | Share |
| ---------------- | -------- | ----- |
| 1                | 9,734    | 12.4% |
| 2–4              | 23,933   | 30.4% |
| 5–9              | 18,993   | 24.1% |
| 10–29            | 18,981   | 24.1% |
| 30+              | 7,159    | 9.1%  |

Median 6 games per map, p90 28, max 555.

Reliability is `rho(n) = n / (n + k)`. At the median map, `rho(6) = 0.35`. The
standard error of a six-game mean is 0.181, which is 1.4x the entire between-map
SD of 0.132 — the noise on a typical map's estimate is larger than the full range
of the signal being estimated. Today the card draws a seven-bin histogram from
those six points and labels the result a property of the beatmap.

Caveat to carry forward: `tau^2` was estimated on maps with n >= 20, a
popularity-selected subsample, and within-map variance there still mixes rank
ranges. Mixing cohorts inflates `sigma^2`, so **0.081 is a floor** on the true
within-cohort map effect. The production fit must use a variance-components
estimator over all maps with n >= 2, per cohort.

### 2.4 How much data is unverified

Games attached to a beatmap, by where verification fails — 1,271,259 rows:

| Population                                 | Games   | Share |
| ------------------------------------------ | ------- | ----- |
| Fully verified (tournament + match + game) | 932,167 | 73.3% |
| Tournament not verified                    | 179,534 | 14.1% |
| Tournament verified, match not             | 7,697   | 0.6%  |
| Tournament + match verified, game not      | 151,861 | 11.9% |

Just over a quarter of beatmap games are not fully verified, and the largest
single slice is game-level rejection inside otherwise-verified tournaments.

Pool records in `join_pooled_beatmaps`, by the pooling tournament's status:

| Tournament status | Pool rows | Distinct beatmaps | Distinct tournaments |
| ----------------- | --------- | ----------------- | -------------------- |
| Verified (4)      | 256,155   | 85,941            | 2,520                |
| Rejected (3)      | 38,054    | 26,924            | 381                  |
| PreVerified (2)   | 2,362     | 2,225             | 25                   |
| PreRejected (1)   | 519       | 517               | 6                    |

Per beatmap, across the 95,755 beatmaps appearing in at least one pool:

- 9,814 (10.2%) appear **only** in unverified or rejected tournaments
- 28,813 (30.1%) would show a lower count under a verified-only filter
- mean 3.10 pooling tournaments shown today vs 2.68 verified — 16% inflation

## 3. Metric and verification scope

### 3.1 The metric

Per qualifying game: `lr = ln(W / L)`.

Symmetric under swapping the teams (sign flip), unbounded, and the natural scale
for a multiplicative score process. The current form is `1 - e^(-lr)`, which
saturates: everything from "loser scored 60% of winner" down to "loser scored 0%"
collapses into the single `40%+` bin, and that bin holds 26.4% of all osu! games.

Exclusions, on top of the verification scope below and the existing two-roster
filter:

- unequal roster sizes between the two rosters (28 games today) — summing three
  players against four is not a comparable quantity;
- either roster scoring 0. The current query only NULLs a zero _winning_ score;
  a zero _losing_ score currently yields a 100% margin. There are none in the
  verified set today, so this is a guard, not a fix.

### 3.2 Verification scope

Two populations, two jobs:

- **Usage credit is all-inclusive.** Tournaments get rejected for format reasons
  while still being real-world play, so a map earns full credit for every game it
  appeared in. "384 games played" stays 384.
- **Analysis is verified-only.** Score distributions, mod usage, miss counts,
  grades, tier breakdowns, closeness — anything a mappooler would regress on.
  Only verified data can be _guaranteed_ to reflect genuine tournament use, so
  only verified data feeds these. Tournament, match, and game all at
  `Verified = 4`; score-level statistics add score `Verified = 4`.

Neither population is hidden. What must never happen is one displayed number
silently mixing them.

**Audit result, 2026-08-11: no statistic currently leaks.** Every score-derived
query in `beatmapProcedures.ts` already filters all four levels — per-tournament
averages and lobby strength (406-453), mod usage (454-491), top performers
(492-547), per-game mod composition (548-591), score quartiles by mod (593+), and
the `verifiedScoreFilter` consumers covering the score CDF, score samples,
performance counts, miss buckets, grade counts, freemod picks, rank-range mods,
and the tier breakdown. The closeness query filters all three game levels. There
is nothing to fix in the analytical layer.

**Where the carve-out stops.** Rejection cascades downward: a rejected
tournament forces every match and game beneath it to rejected, and 74.5% of
those games carry only the inherited `RejectedMatch` flag. So "verified game
inside a rejected tournament" does not exist, and the two cases are separable
only by the tournament's status:

- **tournament not verified** → credit the games. The event was set aside
  wholesale, often for format, and its games never got an independent judgment.
- **tournament verified, game rejected** → no credit. A reviewer judged that
  specific game. 159,556 games corpus-wide.

**Implemented 2026-08-11** (the labelling half of this spec shipped ahead of the
closeness rebuild):

| Location                                        | Change                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `beatmapProcedures.ts` usage-credit query       | Was unfiltered. Now `tournament <> Verified OR (match = Verified AND game = Verified)`  |
| `beatmapProcedures.ts` `poolingRow`             | Added `verifiedTournamentCount` beside the all-inclusive pair                           |
| `beatmapStats.ts` `BeatmapStatsSummarySchema`   | Added `verifiedTournamentCount`; documented what each count may and may not be used for |
| `BeatmapOverviewCard.tsx` "Pooled in"           | Added `N verified` sublabel                                                             |
| `BeatmapOverviewCard.tsx` "Games"               | Vague `incl. unverified` replaced with the concrete `N verified` count                  |
| `BeatmapOverviewCard.tsx` usage sparkline title | Names both populations: verified games, all-inclusive pool records                      |

"Pooled in" and "Games" now share one grammar — all-inclusive headline, verified
subset underneath — so the reader learns the pattern once. Pick rate keeps its
`X of Y pools` sublabel; the adjacent "Pooled in" tile supplies the split for
the same `Y`.

The comment at `beatmapProcedures.ts:294-297` documents the pooling intent —
"the question is how often a pick happened at all, so both the numerator and the
denominator have to count every tournament that recorded the map in its pool."
That intent is correct and survives unchanged for the pool counts.

Note that 10.2% of pooled beatmaps appear only in unverified or rejected
tournaments (section 2.4). Those maps keep their usage credit and show zero
verified pools — which is exactly the signal a mappooler needs.

**Small-n explainability.** The closeness card reports how many games it excluded
as unverified alongside its verified `n`. A map showing six games and no verdict
should say why, not leave the reader guessing whether the map is unpopular or the
data is filtered.

## 4. Cohort model

**Cohort = ruleset x team size**, team size capped at `5+`.

Rank range is deliberately excluded from the cohort key. It moves the osu! median
margin by about 5 points, second-order next to the 20x ruleset spread and the 2x
team-size spread, and including it shatters the cells — 18 cohort cells clear 200
games on ruleset x team size alone, and mania 7K 3v3 has only 214 games in total.
The residual rank-range bias is well inside the noise of a six-game map.

Fallback chain when a cell is too thin to fit (`game_count < 1000`): ruleset-only,
then global. On today's data exactly one cell falls back.

Each cohort carries a fitted baseline: game count, mean and SD of `lr`,
between-map variance, shrinkage constant, and empirical quantiles of the
standardized game-level distribution for the chart's reference band.

## 5. Read-time statistics

Standardize per game against its own cohort, `z = (lr - mu_c) / sigma_c`, then
aggregate. A beatmap that appears in several cohorts contributes several rows;
standardization makes them poolable.

From stored sufficient statistics per cohort row (`n_c`, `S_c = sum(lr)`,
`Q_c = sum(lr^2)`):

```
sum_z(c)  = (S_c - n_c * mu_c) / sigma_c
sum_z2(c) = (Q_c - 2 * mu_c * S_c + n_c * mu_c^2) / sigma_c^2

N    = sum over c of n_c
Z    = sum over c of sum_z(c)
zbar = Z / N
```

Because `z` is standardized within cohort, total variance is 1, so
`tau_z^2 = ICC` and `k = (1 - ICC) / ICC`. For a map spanning cohorts, use the
n-weighted mean `k` across its rows.

```
shrunk       = (N / (N + k)) * zbar
posterior sd = sqrt(tau_z^2 * k / (N + k))
percentile   = Phi(shrunk / tau_z)
```

`sum_z2` is retained for the map's own spread and for future diagnostics; the
headline does not depend on it.

**Reliability gate.** `rho = N / (N + k)`. Below `rho = 0.5` — roughly n < 11 in
osu! 1v1, which covers about two thirds of all beatmaps — the card renders no
verdict word and no percentile. It shows the games against the cohort baseline
and nothing more.

## 6. Storage

Two narrow tables. Sufficient statistics only, so a baseline refit never triggers
a rewrite cascade across 78,800 beatmap rows.

```
beatmap_closeness_stats
  beatmap_id, ruleset, team_size          -- composite PK
  game_count, sum_log_ratio, sum_log_ratio_sq
  excluded_unverified_game_count
  updated_at

beatmap_closeness_baselines
  scope, ruleset, team_size               -- composite PK
  game_count, mean_log_ratio, sd_log_ratio
  between_map_var, shrinkage_k
  z_deciles                               -- 9 edges, q10..q90 of game-level z
  computed_at
```

`team_size` is stored capped at 5. `scope` distinguishes the three fallback
levels — `0` cohort, `1` ruleset-wide, `2` global — with unused dimensions
zeroed, so the fallback chain is three lookups rather than a branch. The
`ruleset` column keeps its persisted enum meaning at every scope; no sentinel is
overloaded onto it.

`z_deciles` serves both consumers: the chart's bin edges at n >= 10 and the
shaded reference band.

`excluded_unverified_game_count` is a history figure, never an input to the
statistics. It exists so the card can explain a small `n` (section 3.2). Only
fully-verified games contribute to `game_count`, `sum_log_ratio`, and
`sum_log_ratio_sq`.

**Per-map refresh** extends the existing trigger path from migration
`apps/web/drizzle/0014_sleepy_cannonball.sql`: `refresh_beatmap_stats(beatmap_id)`
and its `_for_match` / `_for_tournament` wrappers already recompute derived
beatmap rows incrementally on game, match, and tournament changes. Closeness
sufficient statistics recompute in the same function, in the same transaction.

Verification changes must move rows between the verified and excluded counts, so
the refresh has to fire on verification transitions at all three levels, not only
on inserts. Migration `0014` already wires those paths.

**Baseline refresh** is a new slow job on the `apps/data-worker/src/stats`
calculator / service / worker triad, alongside `tournament-stats-*`. It is a full
re-fit, not incremental, and does not need to be frequent — cohort baselines move
slowly at these volumes.

Physical SQL names, the new table shapes, and the public response shape are
cross-language contracts. This work goes through
`.agents/skills/change-otr-contracts/SKILL.md`.

## 7. Public API

`GET /beatmaps/{id}/stats` is a documented public endpoint (`tags: ['public']`).
**Decision: replace `teamVsMargins` outright.**

The cost of that decision is currently near zero: neither `teamVsMargins` nor
`BeatmapMarginCard.tsx` exists on `master` — the whole beatmap redesign is
unreleased on `feature/beatmap-redesign`. Verified 2026-08-11. There are no
external consumers of the bucket array yet, so this is a pre-release shape change
rather than a break, provided the redesign has not been deployed to a
publicly-reachable preview. **If this spec is picked up after the redesign
merges, re-evaluate: it becomes a genuine public break needing a migration note
in the change-contracts write-up and an `otr-docs` update.**

New shape, replacing `BeatmapTeamVsMarginSummary`:

- `gameCount` — verified games contributing, after exclusions
- `excludedUnverifiedGameCount` — history context, never an input
- `cohort` — ruleset and team-size band actually used, plus which fallback level
- `reliability` — `N / (N + k)`
- `percentile` and `percentileInterval` — null below the reliability gate
- `bins` — the map's game counts against the cohort's standardized bin edges
- `baseline` — the cohort's reference quantiles for the band
- `games` — per-game standardized values, for the dot strip at small n

Section 3.2 additionally adds a verified-pool count alongside the existing
all-inclusive pooling fields. That is additive — no existing field changes
meaning or value.

## 8. UI

`BeatmapMarginCard` keeps its slot, `SectionCard` shell, and shadcn/Recharts
composition. Reinventing a `ui/` primitive is out of the question.

- The cohort reference distribution renders as a shaded band behind the data, in
  every state. Without it there is no baseline and the reader has nothing to
  judge the map against.
- **n < 10:** dot strip of individual games on the standardized axis. Honest at
  small n, and it is the majority case.
- **n >= 10:** bars, binned on the cohort's z-decile edges. A perfectly typical
  map then reads as a flat profile, which makes "unusual" visually obvious
  without the reader doing arithmetic.
- Header meta shows the shrunk percentile with its interval above the gate, and
  the plain verified game count below it.
- Where games were excluded as unverified, the card says so next to the count.
- Caption describes score spread against comparable maps. The coinflip/stomp
  wording is removed.

**Decision: no drift disclosure.** Percentiles shift as cohorts grow; that is
treated like every other rebuildable derived value on the page and is not
surfaced in the card.

Typography follows the repo standard: `--font-sans`, sentence case, no uppercase,
`text-xs` floor with `text-[11px]` only for dense axis ticks.

## 9. Non-goals

- **Decisiveness / upset rate on the beatmap page.** It needs the rating gap and
  is not estimable at a median of six games. If it is wanted, it belongs on
  tournament surfaces where n supports it.
- **Rank range in the cohort key.** Section 4.
- **Rating-gap conditioning in the metric.** 1.1% of variance; not worth the join.
- **Head-to-head, tag co-op, and tag team-vs games.** Unchanged, still excluded.
- **Removing unverified usage from the page.** Section 3.2 separates it; it is
  not deleted.
- **Any change to rating semantics.** This is a presentation metric over verified
  game scores. It feeds nothing the processor reads.

## 10. Acceptance criteria

1. A mania 4K map and an osu! map with comparable standing in their own cohorts
   render comparable cards. Today one is a left spike and the other a right wall.
2. A map with n <= 10 renders individual games and no percentile claim.
3. A map spanning two cohorts pools them correctly — verified against a
   hand-computed fixture.
4. Games with unequal roster sizes or a zero roster score never contribute.
5. No beatmap statistic changes value when an unverified game is added, at any of
   the three verification levels. Usage counts _do_ change. One test fixture
   asserts both halves.
6. A beatmap pooled only in rejected tournaments (10.2% of pooled maps) keeps its
   full usage credit and reports zero verified pools.
7. Verifying a previously-unverified game moves it from
   `excluded_unverified_game_count` into the statistics, and rejecting a
   previously-verified game moves it back.
8. Baseline refit does not rewrite `beatmap_closeness_stats`.
9. Per-map statistics stay correct across game insert, game verification change,
   match verification change, and tournament verification change — the four paths
   migration `0014` already covers for `beatmap_stats`.
10. Unit tests cover the shrinkage math, the cohort fallback chain, the
    reliability gate boundary, and the sufficient-statistic pooling identities in
    section 5.
11. A parity test pins the TypeScript read-time math against the SQL that
    produces the sufficient statistics, matching the existing
    `tierNameFromRatingArithmetic` parity pattern in `beatmapStatsHelpers.ts`.

## 11. Risks

- **Public API shape change.** Section 7. Low cost while the redesign is
  unreleased; becomes a real break if this lands after `feature/beatmap-redesign`
  merges. Re-check `master` before implementing.
- **Pool counts must stay all-inclusive.** Stated so nobody "fixes" them later:
  "Pooled in" and "Pick rate" keep every pooling tournament in their headline
  values. Filtering those to verified-only would strip usage credit from real
  tournament play and is the opposite of the intent.
- **The games count did drop, deliberately.** It fell about 12.6% corpus-wide
  when merit-rejected games inside verified tournaments stopped earning credit
  (section 3.2). That is the intended semantics, not a regression.
- **`tau^2` is estimated from a selected subsample.** Section 2.3. The production
  fit must not reuse the numbers in this document.
- **Baselines drift silently.** Accepted by decision. A map's percentile can move
  with no change to the map.
- **Interpretation.** The card still says something about a beatmap when 92% of
  the variance is not the beatmap. The reliability gate, the reference band, and
  the shrunk estimate are the three mechanisms holding that honest; none of them
  is optional.
