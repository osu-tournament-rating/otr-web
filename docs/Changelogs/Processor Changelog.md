This page records changes to the o!TR processor, which is developed in [otr-web](https://github.com/osu-tournament-rating/otr-web) under [`apps/processor`](https://github.com/osu-tournament-rating/otr-web/tree/master/apps/processor). Changelog format is based on [keep a changelog](https://keepachangelog.com/en/1.1.0/).

Processor releases up to `2026.08.16` were published from the [otr-processor](https://github.com/osu-tournament-rating/otr-processor) repository, and their entries link there. Later processor releases are [otr-web releases](https://github.com/osu-tournament-rating/otr-web/releases) that changed the processor, so a processor version is the tag of that otr-web release.

> [!note]
> This changelog began tracking releases on 2026.08.16. Changes made before that date are not recorded on this page.

## Unreleased

### Other

- Changed the processor to be developed and released from [otr-web](https://github.com/osu-tournament-rating/otr-web/tree/master/apps/processor) under `apps/processor`. Releases up to `2026.08.16` remain in the [otr-processor](https://github.com/osu-tournament-rating/otr-processor/releases) repository.
- Changed the processor to read `DATABASE_URL` and `RABBITMQ_AMQP_URL`, the names in otr-web's `.env`, before falling back to `CONNECTION_STRING` and `RABBITMQ_URL`.

## [2026.08.16](https://github.com/osu-tournament-rating/otr-processor/compare/2026.08.04...2026.08.16)

### Fixed

- Pinned the processor's required Rust version to match the documentation.
