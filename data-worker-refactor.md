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

- [ ] Phase 1: Porting data structure skeletons
  - [x] Port all queue message types.
    - For data structures such as Game or Match, reuse existing types from packages/otr-core/db/schema.ts
  - [x] Use the osu-api-v2-js package for osu!API types. Don't reuse the logic from the web app for the dataworker, we want these client instances to be separate. Split the current OSU_CLIENT_ID and OSU_CLIENT_SECRET env vars into two separate vars: one for the data-worker project and one for web.
  - [x] Port UserStatUpdate type from /Users/stage/code/git/otr/otr-api/OsuApiClient/Domain/OsuTrack/UserStatUpdate.cs for osu!track data fetching.
- [ ] Phase 2: TDD
  - [ ] Port all unit testing logic identically. Scaffold the project similarly to the legacy project, following TypeScript/bun development best practices. Use vitest. We must ensure the tests are reproducible exactly as-is to ensure parity in behavior. Do not test menial logic such as whether logs were produced, test business-critical logic such as automated checks. We want these tests to fail initially, implementation will come in future phases.
    - [ ] Automated checks tests
    - [ ] Stats tests
    - [ ] End-to-end test of osu!track data fetch
    - [ ] End-to-end test of osu! match, beatmap, and player fetch. Player fetch should look at a single ruleset for now and be expanded to support mania variant data later.
  - [ ] Update the root package.json with new scripts for testing and running both the web and dataworker applications. Separate and combined scripts should be used, i.e. `bun run dev` should run both apps in development mode simultaneously. `bun run test` should test both applications simultaneously, and so on. The web project doesn't have tests at the moment so only the data-worker needs to be tested right now.
  - [ ] Document how to run and test the applications in README.md. If a project has no tests, don't document a non-existent testing procedure for that app.
- [ ] Phase 3: osu!track data fetching queue
  - [ ] Port osu!track data fetching logic. Ensure the logic is triggered by a queue message. It is quite simple, the exhaustive API documentation is located in this single file. https://raw.githubusercontent.com/Ameobea/osutrack-api/refs/heads/main/README.md - Read the contents of the file using the internet and implement an elegant solution for fetching. Add rate-limiting support that is configurable in .env (in requests/minute format).
  - [ ] Validate end-to-end test passes.
- [ ] Phase 4: osu! data fetching queues
  - [ ] Use the osu-api-v2-js package to fetch osu! data. Match, player, and beatmap fetching is all we need. Refer to /Users/stage/code/git/otr/otr-web/packages/otr-core/src/db/schema.ts to see exactly how we store the result data. Mirror the logic & behavior from the legacy application. Ensure configurable rate limits are defined and respected. Ensure testability and queue consumption behavior mirrors the legacy application. Create an end-to-end test for this action item.
- [ ] Phase 4: Automated checks
  - [ ] Implement the automated checks logic from the legacy application. Follow TDD and implement without modifying existing automated checks tests which are failing.
