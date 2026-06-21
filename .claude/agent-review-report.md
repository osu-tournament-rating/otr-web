# otr-web Agent Fleet — Consolidated Review Report

## 1. Executive Summary

Eight new agents were authored, reviewed by a three-lens panel, and remediated. All eight pass the under-20k-token budget comfortably (peak ~7.7k tokens) and are style-conformant. Final panel scores are strong: every new agent scored 4 or 5 on all three lenses, with no score below 4. The dominant finding across the fleet was tool over-provisioning (a kitchen-sink `tools:` block carrying NotebookEdit, Cron*, RemoteTrigger, PushNotification, DesignSync, and the Task* family that no role exercises). This was fixed where the panel reached consensus (otr-test-engineer, otr-auth-engineer, otr-frontend-data-engineer) and deliberately deferred where reviewers disagreed because the block is a byte-identical fleet-wide convention shared across implementer siblings (otr-orpc-engineer, otr-data-worker-engineer, otr-verification-engineer). One genuine domain error was caught and fixed: otr-data-worker-engineer wrongly claimed it could enqueue stats messages when it is strictly the consumer (the Rust otr-processor is the publisher). No unresolved Critical findings remain on any new agent. The two unresolved High findings are both the same deferred tool-trim convention question, not behavioral defects.

The four existing agents (otr-architect, otr-db-architect, otr-ui, dry-utility-enforcer) were panel-reviewed as the style reference and were NOT edited. They carry more serious issues than the new agents — most notably advisory agents holding mutation tools (otr-architect grants Edit/Write/NotebookEdit while declaring itself read-only; otr-ui omits the `tools:` field entirely and silently inherits Edit), and missing cross-system boundaries (otr-db-architect has zero mention of otr-processor, the tool most easily and silently broken by shared-table schema changes). These are documented below as recommendations only.

## 2. Convergence / Coverage Map

```
OTR-WEB AGENT FLEET — CONVERGENCE / COVERAGE MAP (docs intentionally excluded):
  design / contracts   -> otr-architect, otr-db-architect, otr-rating-domain-expert
  implement: server    -> otr-orpc-engineer, otr-data-worker-engineer, otr-verification-engineer, otr-auth-engineer
  implement: client    -> otr-ui (look & feel), otr-frontend-data-engineer (data flow)
  quality gates        -> otr-test-engineer, otr-code-reviewer, dry-utility-enforcer, code-simplifier
Every new agent must claim ONE clear lane and explicitly defer adjacent work to the named sibling. No two agents own the same job; no lane is left uncovered.
```

## 3. New Agents (authored, panel-reviewed, remediated)

| Agent                      | Priority | Read-only | Final estTokens | Under 20k | Lens 1 | Lens 2 | Lens 3 |
| -------------------------- | -------- | --------- | --------------- | --------- | ------ | ------ | ------ |
| otr-orpc-engineer          | Critical | No        | 6953            | Yes       | 5      | 5      | 5      |
| otr-data-worker-engineer   | Critical | No        | 7714            | Yes       | 5      | 5      | 5      |
| otr-verification-engineer  | Critical | No        | 7287            | Yes       | 4      | 5      | 5      |
| otr-test-engineer          | High     | No        | 7165            | Yes       | 4      | 5      | 5      |
| otr-auth-engineer          | High     | No        | 7029            | Yes       | 4      | 5      | 5      |
| otr-rating-domain-expert   | High     | Yes       | 7693            | Yes       | 5      | 5      | 5      |
| otr-frontend-data-engineer | Medium   | No        | 6724            | Yes       | 4      | 5      | 5      |
| otr-code-reviewer          | Medium   | Yes       | 6645            | Yes       | 5      | 5      | 5      |

Lens 1 = Anthropic agent & system-prompt design principles. Lens 2 = Conformance to otr agent-definition style, token budget, and user communication preferences. Lens 3 = Domain correctness grounded in real code, fleet boundaries/overlap/gaps, tool least-privilege.

### otr-orpc-engineer — Critical, write-capable, 6953 tokens, under limit (5/5/5)

Fixes applied during remediation:

- Dropped NotebookEdit from the tools line as dead privilege (no Jupyter notebooks in this monorepo).
- Tightened the description verb from "implementing, modifying, or reviewing" to "implementing or modifying (and reviewing the procedure-contract implications of a proposed change)" so it no longer competes with otr-code-reviewer.
- Removed the three "<... omitted for brevity>" placeholder fragments from the example commentary blocks to match canonical commentary style.
- Corrected the fabricated `commonSchemas` claim: schemas are imported into `openapi.ts` and registered in its inline `commonSchemas` map, which is not exported from `lib`. This was corrected in three places (What You Own, Output Format, and the agent-memory example).
- Replaced the builder-ladder bare middleware names with the real symbols (`withDatabase`, `withOptionalApiKey`, `withOptionalSession`, `withLoggingContext`, `withMetrics`, `withRequestLogging`, `withErrorBoundary`, `withMaintenanceWindowGuard`) so a grep lands on the actual functions.
- Added a note that `withAuditUserId` comes from `@otr/core/db` and is consumed (not owned) by the oRPC layer.

Unresolved Critical/High findings: None. All findings were Low.

Deferred: Further trimming Cron\*/RemoteTrigger/PushNotification — deferred because it diverges from the fleet-wide canonical tools set shared by sibling implementer specs, and the change is noise-only.

### otr-data-worker-engineer — Critical, write-capable, 7714 tokens, under limit (5/5/5)

This is the largest spec in the fleet but sits comfortably under the 20k ceiling.

Fixes applied during remediation:

- Corrected the stats-message direction-of-flow error (Medium): the otr-rating-domain-expert boundary now states the worker CONSUMES `ProcessTournamentStatsMessage` on `processing.stats.tournaments` (the Rust otr-processor publishes it; no worker-side `RabbitMqPublisher` exists) instead of "may enqueue." Verified against `constants.ts` and `index.ts`.
- Reconciled the drizzle-kit-generate ambiguity (Low): step 9 now says the agent never runs `bunx drizzle-kit generate` itself and defers both the schema edit and migration to otr-db-architect.
- Added a "not this agent" clause to the description tail naming otr-verification-engineer for check rules and otr-rating-domain-expert for ratings/stats.
- Clarified that osu!track raw-to-typed mapping is inline in `osu-track/client.ts` (e.g. `mapUserStatUpdate`), not a separate `conversions.ts` like the osu! side.

Unresolved Critical/High findings: None. One Medium tool-trim finding deferred (see below); the corrected Medium domain error is resolved.

Deferred: Tool least-privilege trim (Medium) — the tools line is a byte-identical fleet-wide convention; Lens 2 treats it as required style conformance, so editing one file would break parity. Token/redundancy trim and the third-example overlap (both Low) — explicitly flagged optional by reviewers.

### otr-verification-engineer — Critical, write-capable, 7287 tokens, under limit (4/5/5)

Fixes applied during remediation:

- Added an exception clause to the directory-ownership sentence noting that `tournament-automation-check-worker.ts` (queue plumbing) belongs to otr-data-worker-engineer, resolving the directory-vs-responsibility overlap.
- Softened the hardcoded `SCORE_MINIMUM = 1000` literal to direct the agent to read its current value from `score-automation-checks.ts`, reducing prompt-vs-code drift.
- Softened the hardcoded `VERIFIED_MATCHES_THRESHOLD = 0.8` literal to direct the agent to read its current value from `tournament-automation-checks.ts`.
- Tightened operate step 6 to remove the soft migration escape-hatch, stating schema/migration work is otr-db-architect's lane and this agent must never run `bunx drizzle-kit generate`.

Unresolved Critical/High findings: The Lens 1 High tool least-privilege trim was deferred (NOT applied) because Lenses 2 and 3 disagreed it is a defect — both state the tools line matches the shared implementer-sibling convention, and the standing rule is to not apply a change two reviewers disagree on. This is a convention question, not a behavioral defect; the agent's lane and behavior are correct.

Deferred: The High tool trim (per rule above) and the optional heading rename / Quality Bar fold (Low).

### otr-test-engineer — High, write-capable, 7165 tokens, under limit (4/5/5)

Fixes applied during remediation:

- Trimmed the kitchen-sink tools frontmatter to a focused least-privilege author set (Read, Write, Edit, Bash, Grep, Glob, LSP, Skill, ToolSearch, WebFetch, WebSearch), dropping Agent, all Cron*, DesignSync, Enter/ExitWorktree, RemoteTrigger, PushNotification, NotebookEdit, all Task*, Monitor, and the MCP list tools — the High finding raised by all three reviewers.
- Added Grep and Glob so the search-heavy operating instructions are backed by first-class tools rather than ad-hoc Bash rg (Medium).
- Removed the now-invalid "use the Agent tool to launch" phrasing from all three description examples to stay consistent with the trimmed toolset.

Unresolved Critical/High findings: None. The consensus High tools-trim was applied.

Deferred: Folding the two memory sections (Low) — the second is required Persistent Agent Memory boilerplate that must be preserved. Moving seed IDs to memory, changing color, and condensing scope sections — all Low and explicitly optional.

### otr-auth-engineer — High, write-capable, 7029 tokens, under limit (4/5/5)

Fixes applied during remediation:

- Trimmed the frontmatter tools list to a role-appropriate least-privilege set (Agent, Read, Edit, Write, Bash, Skill, ToolSearch, LSP, WebFetch, WebSearch), removing Cron*, DesignSync, PushNotification, RemoteTrigger, Monitor, NotebookEdit, Enter/ExitWorktree, the MCP resource tools, and the Task* family — consensus of two reviewers and plainly correct for a security-sensitive auth implementer. WebFetch/WebSearch kept for Better Auth docs lookups.
- Added an otr-verification-engineer disambiguation line to the Boundaries section clarifying that the data-verification lifecycle and rejection bitflags belong to that sibling, while this agent owns only the identity/role primitives the authorization checks consume — a unanimous Low finding closing the only plausible name-collision overlap in the fleet.

Unresolved Critical/High findings: None. The Medium tool finding was applied.

Deferred: A fourth cross-lane example (single-reviewer Low), folding Quality Bar (Low), and color choice (Low, no action required).

### otr-rating-domain-expert — High, read-only, 7693 tokens, under limit (5/5/5)

Fixes applied during remediation:

- Added a read-only Bash restriction to Scope and Boundaries: Bash is for inspection (rg/grep/ls/cat/wc) only and must never mutate files, run migrations, or invoke drizzle-kit, reinforcing the no-diff guarantee.
- Tightened the rating-scale fact bullet to distinguish the two floors explicitly: decay will not pull below the peak-dependent `DECAY_MINIMUM` (1000.0), while `ABSOLUTE_RATING_FLOOR` (100.0) is the only absolute floor on non-decay paths, removing the false "no rating below 1000" implication.
- Added a timing nuance to the Decay fact bullet: the processor batch runs Tuesday but decay/volatility-decay rows are stamped Wednesday 12:00 UTC per the `decay.rs` header, so rating-history charts show decay events offset a day from Match events of the same run.

Unresolved Critical/High findings: None. All findings were Low.

Deferred: Description newline-escaping change (Low, contingent on unverified loader behavior; Lens 2 confirms the current form matches sibling convention) and the optional "Quality Bar" -> "Self-Correction" rename (Low, cosmetic).

### otr-frontend-data-engineer — Medium, write-capable, 6724 tokens, under limit (4/5/5)

Fixes applied during remediation:

- Trimmed the tools line to a least-privilege set (Read, Edit, Write, Bash, LSP, Skill, ToolSearch), removing Cron*, DesignSync, Enter/ExitWorktree, *McpResource*, Monitor, NotebookEdit, PushNotification, RemoteTrigger, WebFetch, WebSearch, and the Task* set per the High consensus.
- Removed Agent from the tools line so the leaf agent cannot self-delegate, matching its hand-off-by-naming design (Medium).
- Corrected the implied location of `TournamentList.tsx` by qualifying it with its real path `apps/web/components/tournaments/list/` and noting it is a component, not a hook.
- Clarified in How You Operate step 7 and the Quality Bar that tsc/lint/format are pre-handback self-checks and committing is the caller's or quality-gate's responsibility.

Unresolved Critical/High findings: None. Both the High tools-trim and the Medium Agent-removal were applied.

Deferred: ASCII decision-tree column alignment, heading rename, and 7-step operating-section length — all Low and cosmetic.

### otr-code-reviewer — Medium, read-only, 6645 tokens, under limit (5/5/5)

Fixes applied during remediation:

- Fronted the description's unique lane (cross-boundary merge-safety risks the generic /code-review skill and compiler miss) so it disambiguates harder against the /code-review skill.
- Tightened the `adminMutationProcedure` wording to make the enforcement boundary explicit: the builder adds only the maintenance-window guard, while admin-role enforcement is in-handler via `ensureAdminSession`, so dropping that call silently removes the admin check.
- Disambiguated the two DRY/simplify deferral targets: DRY violations route to the dry-utility-enforcer agent, over-complex code to the /simplify skill (code-simplifier quality gate), clarifying the latter is a skill, not a peer agent.

Unresolved Critical/High findings: None. All findings were Medium or Low.

Deferred: Tool trim (Medium) — Lens 2 states the list is character-for-character identical to otr-rating-domain-expert and is the established read-only-advisory convention, so reviewers disagree. Memory-section collapse (Low, boilerplate must be preserved), newline escaping (Low, cosmetic), and name quoting (Low, no change required).

## 4. Existing Agents (panel-reviewed, NOT applied — style reference)

These four agents were reviewed against the same three lenses but were NOT edited. The findings below are recommendations only and serve as the style baseline against which the new agents were measured. Note that several existing agents carry more serious issues than the new ones — chiefly advisory agents holding mutation tools and missing cross-system boundaries.

### otr-architect (4/5/4) — recommendations not applied

Ranked findings:

- Critical (Lens 1, tool least-privilege): The agent is explicitly self-described as read-only/advisory ("You are an architect, not an implementer. Do not write feature code, generate migrations, or perform detailed refactors") yet its tools list grants Edit, Write, and NotebookEdit. The prose forbids the exact mutations the toolset enables. Recommendation: remove Edit and NotebookEdit; keep Write only if scoped to agent memory.
- High (Lens 1, least-privilege/simplicity): Beyond mutation tools, the list carries Cron*, DesignSync, Enter/ExitWorktree, RemoteTrigger, PushNotification, Monitor, Task*, and Agent — none connected to architectural review. Recommendation: strip to an advisory reviewer set.
- Medium (Lens 1, boundaries): The description overlaps with otr-db-architect without naming it — both claim shared-table schema changes, and the trigger examples nearly mirror each other. Recommendation: name the otr-db-architect hand-off explicitly in Scope Discipline.
- Medium (Lens 3, fleet boundaries): The convergence rule requires explicit deferral to a named sibling, but the architect never names otr-db-architect / otr-orpc-engineer / otr-data-worker-engineer as the implementers of deferred work.
- Low (Lens 1, examples): All three examples are schema/queue-centric; no example covers the env/deployment or semantics-only seams the prose claims.
- Low (Lens 2, communication): No concrete diagram template despite the user's stated preference for visual explanation (a fleet-wide nit, not unique).
- Low (Lens 3, domain): Omits otr-scripts (Python ops/backup/restore + processor runner) from "The Suite You Govern" despite claiming deployment topology in scope.
- Low (Lens 3, domain): No mention of the snake_case-vs-camelCase nuance — otr-processor reads shared tables by raw SQL name, so a Drizzle identifier rename is harmless but a SQL column/table rename is the real break vector.

### otr-db-architect (4/5/3) — recommendations not applied

Ranked findings:

- Critical (Lens 3, cross-system gap): The spec has ZERO mention of otr-processor or cross-system escalation. otr-processor reads tournaments/matches/games/game_scores and writes player_ratings/rating_adjustments/player_tournament_stats; it is the tool most easily and silently broken by shared-table schema changes, and otr-web tests will not catch the break. This agent can freely alter those exact tables with no instruction to recognize the seam or escalate to otr-architect. Recommendation: add a boundary section requiring escalation to otr-architect for shared-table / queue-contract changes before generating the migration.
- High (Lens 1, boundaries): The spec never names a single sibling despite heavy, predictable overlap with otr-architect on exactly the highest-stakes schema changes. Recommendation: add a Boundaries section deferring cross-system blast-radius to otr-architect, procedure work to otr-orpc-engineer, and worker-write logic to otr-data-worker-engineer.
- High (Lens 3, description trigger overlap): The description claims "processor capabilities such as additional generated statistics" while the body never acknowledges the processor exists and otr-architect claims that seam. Recommendation: scope the trigger to otr-web-owned mechanics and add deferral language.
- Medium (Lens 1, tool least-privilege): Kitchen-sink grant (Cron*, PushNotification, RemoteTrigger, DesignSync, Worktree, Monitor, NotebookEdit, Web*, Task\*) far beyond what schema work needs; Edit/Write/Bash are correctly justified.
- Medium (Lens 1, structure/proportion): Generic memory boilerplate outweighs the valuable role-specific guidance roughly 2:1, with duplicated memory headers.
- Low (Lens 1, description specificity): Trigger boundary against otr-architect not stated in the description.
- Low (Lens 2, domain accuracy): The createSelectSchema derivation is cited in the procedures directory, but it actually lives in `apps/web/lib/orpc/schema/base.ts`; the `.omit({ searchVector: true })` literal is a documented convention, not an in-use pattern.
- Low (Lens 2, section naming): `## Output Expectations` and `## Self-Correction` diverge from the canonical `## Output Format` / `## Quality Bar`.
- Low (Lens 2, scope discipline): No dedicated Scope Discipline section.
- Low (Lens 3, domain grounding): Select-schema derivation location and the dual memory configuration noted as minor accuracy/verbosity issues.

### otr-ui (4/4/3) — recommendations not applied

Ranked findings:

- Critical (Lens 3, tool least-privilege): The frontmatter has NO `tools:` field, so the agent silently inherits the full toolset including Edit, Write, and NotebookEdit, while the body frames it as advisory ("the authority that other contributors consult before they build"). Recommendation: add an explicit `tools:` line granting Read, Bash, Write (memory/screenshots only), Skill, ToolSearch, and the Playwright MCP tools, deliberately omitting Edit.
- High (Lens 1, tool least-privilege): Same omitted-tools-field issue from the design-principles lens.
- High (Lens 1, boundaries): Never names a sibling; the trigger examples (leaderboard page, rating-over-time chart) inherently cross into otr-frontend-data-engineer's data-flow lane with no defer-to clause.
- High (Lens 2, scope discipline): No dedicated Scope Discipline section; line 39 actively reaches into the data lane by instructing the agent to document SWR + withRequestCache patterns. Recommendation: add a Scope Discipline section deferring data flow to otr-frontend-data-engineer and soften line 39 to awareness-only.
- High (Lens 3, fleet boundaries): Same overlap-with-no-boundary against otr-frontend-data-engineer from the domain lens.
- Medium (Lens 1, persona consistency): Internally ambiguous about whether it edits code — advisory framing plus inherited full tools means it could edit .tsx files. Recommendation: pick one model and state it explicitly.
- Low (Lens 1, composability): The Playwright workflow hand-rolls dev-server lifecycle instead of using the purpose-built `run-otr-web` skill (which standardizes on :3000).
- Low (Lens 1, right altitude): The entire identity is anchored to "the player page" as the gold standard, which is brittle if that page is redesigned.
- Low (Lens 2/3, section naming and workflow): `## Memory` vs `## Agent Memory`, operating-section naming drift, and the ad-hoc server management noted above.

### dry-utility-enforcer (4/4/4) — recommendations not applied

Ranked findings:

- High (Lens 1, tool least-privilege): Grants Cron*, DesignSync, Worktree, Monitor, PushNotification, RemoteTrigger, Web*, Task\*, MCP-resource tools — unrelated to a duplication/utility-placement role. Edit/Write are correctly retained since the agent refactors. Recommendation: trim to Read, Grep, Glob, Edit, Write, Bash, Skill, ToolSearch.
- High (Lens 1, boundaries): Never names a sibling; says "You are not a general code reviewer" but does not name otr-code-reviewer, and never distinguishes itself from code-simplifier, whose reuse/simplification remit overlaps heavily. Recommendation: add explicit deferral lines naming otr-code-reviewer (correctness/style) and code-simplifier (broad simplification).
- Medium (Lens 1, portability): Hardcodes an absolute machine path (`/home/stage/code/git/otr/otr-web/.claude/agent-memory/dry-utility-enforcer/`) and asserts the directory "already exists," which is false for teammates and CI. Recommendation: use a repo-relative path and soften the existence claim.
- Medium (Lens 2/3, fleet lane): Same code-simplifier overlap-with-no-boundary from the conformance and domain lenses.
- Low (Lens 1, internal consistency): ~150 of 224 lines are generic memory boilerplate, dwarfing the role-specific guidance; a redundant memory reminder appears under Quality Control. Notably this is the one panel cell flagged as NOT under the token limit (Lens 1 marked underTokenLimit:false), driven by the boilerplate weight.
- Low (Lens 1, examples): No example shows the agent's own output, including the failure-prone "No action — genuinely single-use" verdict.
- Low (Lens 2, section naming): `## Scope and Boundaries` vs canonical `## Scope Discipline`; memory lead-in folded under Quality Control rather than its own heading.
- Low (Lens 2/3, grounding): Tools list unordered; canonical utility homes (`apps/web/lib/utils/`, `packages/otr-core/src/utils/`) named only generically.

## 5. Fleet-Level Assessment

Lane coverage against the convergence map is complete, and no two new agents own the same job:

- design / contracts: otr-architect (cross-system blast radius), otr-db-architect (schema/migration mechanics), otr-rating-domain-expert (read-only rating semantics). The new otr-rating-domain-expert cleanly carves the advisory rating lane and defers all writes.
- implement: server: otr-orpc-engineer, otr-data-worker-engineer, otr-verification-engineer, otr-auth-engineer. The most plausible collisions were caught and closed during remediation: otr-data-worker-engineer now owns only message transport and defers rules to otr-verification-engineer and ratings/stats to otr-rating-domain-expert; otr-verification-engineer cedes `tournament-automation-check-worker.ts` queue plumbing to otr-data-worker-engineer; otr-auth-engineer explicitly disambiguates its auth/API-key "verification" from otr-verification-engineer's data-verification lifecycle (the only name collision in the fleet).
- implement: client: otr-ui (look & feel) and otr-frontend-data-engineer (data flow). The new otr-frontend-data-engineer correctly defers styling to otr-ui and procedure work to otr-orpc-engineer. The residual risk lives on the existing otr-ui side, which reaches into the data lane (line 39) with no boundary statement — see Section 4. This is the one remaining client-lane overlap, and it is the existing agent's defect, not the new one's.
- quality gates: otr-test-engineer, otr-code-reviewer, dry-utility-enforcer, code-simplifier. otr-code-reviewer now disambiguates against the /code-review and /security-review skills and routes DRY -> dry-utility-enforcer, over-complexity -> /simplify (code-simplifier). The existing dry-utility-enforcer still lacks an explicit boundary against code-simplifier — see Section 4.

Cross-cutting observations:

- Tool least-privilege is the fleet's dominant systemic issue. The kitchen-sink `tools:` block is shared byte-for-byte across implementer siblings, so individual edits break style parity. The recommendation is to fix this once as a fleet-wide convention (trim NotebookEdit, Cron*, RemoteTrigger, PushNotification, DesignSync, Worktree, Monitor, and Task* from all implementer specs uniformly) rather than per-file. The two unresolved High findings on new agents (otr-verification-engineer, plus the same class on otr-code-reviewer at Medium) are this convention question, not behavioral defects.
- The existing advisory agents (otr-architect, otr-ui) carry mutation tools that contradict their stated read-only posture — the single most serious unaddressed risk in the fleet, since it lets an advisory agent silently edit source.
- No new agent exceeds the 20k-token budget; the heaviest is otr-data-worker-engineer at 7714. The only under-limit failure flagged anywhere is the existing dry-utility-enforcer on one lens, driven by boilerplate weight.

No lane is left uncovered, and there are no remaining overlaps among the new agents. The two residual overlaps (otr-ui into the data lane; dry-utility-enforcer vs code-simplifier) both originate in existing agents that were intentionally not edited.
