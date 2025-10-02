# Plan: Port otr-api/DWS to TypeScript

<read-only>
High-level objectives, rules, and criterion:

1. Port the otr-api/DWS project (located at /Users/stage/code/git/otr/otr-api/DWS) to TypeScript, maintaining nearly identical RabbitMQ behavior.
2. Replace the existing ./apps/data-worker starter project with the new implementation.
3. Track all progress in this file by updating task lists.
4. Update github actions workflows and Dockerfiles to deploy using bun.
5. By the end, implement a single `bun run dev` command which launches the data-worker and web apps simultaneously.
6. Port common logic to ./packages and reuse in the web and data-worker applications.
   </read-only>

## Tasks

Use this section to track your progress by checking off items which are implemented. Do not work on items which are already implemented. Do not modify item descriptions.

- [x] Phase 1: Porting data structure skeletons
  - [x] Port all queue message types.
    - For data structures such as Game or Match, reuse existing types from packages/otr-core/db/schema.ts
  - [x] Use the osu-api-v2-js package for osu!API types. Don't reuse the logic from the web app for the dataworker, we want these client instances to be separate. Split the current OSU_CLIENT_ID and OSU_CLIENT_SECRET env vars into two separate vars: one for the data-worker project and one for web.
  - [x] Port UserStatUpdate type from /Users/stage/code/git/otr/otr-api/OsuApiClient/Domain/OsuTrack/UserStatUpdate.cs for osu!track data fetching.
- [x] Phase 2: osu!track data fetching queue
  - [x] Port osu!track data fetching logic. Ensure the logic is triggered by a queue message. It is quite simple, the exhaustive API documentation is located in this single file. <https://raw.githubusercontent.com/Ameobea/osutrack-api/refs/heads/main/README.md> - Read the contents of the file using the internet and implement an elegant solution for fetching. Add rate-limiting support that is configurable in .env (in requests/minute format).
  - [x] Create an end-to-end test for this scenario.
- [x] Phase 3: osu! data fetching queues
  - [x] Use the osu-api-v2-js package to fetch osu! data. Match, player, and beatmap fetching is all we need. Refer to /Users/stage/code/git/otr/otr-web/packages/otr-core/src/db/schema.ts to see exactly how we store the result data. Mirror the logic & behavior from the legacy application. Ensure configurable rate limits are defined and respected. Ensure testability and queue consumption behavior mirrors the legacy application.
  - [x] Create end-to-end tests for these scenarios.
- [x] Phase 4: Automated checks
  - [x] Port the automated checks logic from the legacy application. Follow TDD and implement without modifying existing automated checks tests which are failing. Ensure unit tests pass.
  - [x] Port the queue consumer logic to re-run automated checks for a tournament ID. Upon running, the data should be loaded from the database and all automated checks should be run.
- [x] Phase 5: Stats
  - [x] Port the statistics logic from the legacy application. Follow TDD and implement without modifying the statistics or calculations. CRITICAL: Ensure that the same tables and columns being modified in the legacy application are being touched in the new implementation. The new implementation should iterate and improve upon the QUALITY of the code to ensure readability and testability.
- [x] Phase 6: UI logic
  - [x] When a tournament is submitted, enqueue messages for each match and beatmap so we fetch the data immediately after submission. Once both beatmap and match data has finished fetching, the tournament automation checks queue message should be enqueued. Verify this behavior through an end-to-end test. The legacy behavior does this already.
  - [x] When an admin adds a pooled beatmap to a tournament, the beatmap data must be enqueued for fetching
  - [x] Identify any additional areas where otr-web needs to publish additional queue messages to the data-worker. List for human review/approval.
    - Admin "Refetch match data" flow (`tournaments/admin/refetchMatchData`) should publish match and beatmap fetch messages after resetting statuses (currently TODO in procedure and button component).
- [ ] Phase 7: CI/CD
  - [ ] Update the otr-web repository docker images and .github/workflows files to use this new structure. Create a docker-compose file. Ensure migrations and other edge cases are handled correctly. Ensure lint / quality checks are made at the PR stage and block deployments with build failures. Retain the behavior of deploying specific branches/tags to staging/production environments. Ensure releases with a YYYY.MM.DD[.*] title trigger a production release.
  - [ ] The docker-compose project should launch both the web and data-worker applications simultaneously. They are not necessarily dependent on each other, they just depend on a database connection.
  - [ ] Reference the otr-api docker-compose file and port over any logic required (i.e. db). Grafana/telemetry is not required at this time.
