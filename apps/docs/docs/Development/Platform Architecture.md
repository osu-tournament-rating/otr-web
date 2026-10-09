The o!TR platform relies on multiple projects and technologies to function. These projects were recently overhauled to incorporate [queueing](https://en.wikipedia.org/wiki/Message_queue). This is a very important aspect of our architecture to be aware of in order to understand how data flows throughout the system.

This section details the high-level architecture of the platform and each software project. To skip straight to development, jump to the [[Development/Development Guide|development guide]].

### Queueing

Here are a few scenarios that showcase exactly how data flows across applications using a message broker (powered by [RabbitMQ](https://www.rabbitmq.com/)).

#### Tournament submission

1. An admin submits a tournament.
2. The web backend enqueues messages for each osu! beatmap and match ID provided.
3. The queues `data.osu.matches` and `data.osu.beatmaps` are now populated, so the data worker activates to empty these queues by fetching data from the osu! API.
4. Once all queues are empty, the data worker enqueues a message to `processing.checks.tournaments` to run automated checks for that tournament.
5. The `processing.checks.tournaments` queue sees a new message and runs automated checks for the tournament.

#### Resetting automated checks

1. Admin clicks button to reset automated checks for a tournament.
2. The web backend enqueues a message to reset automated checks for the tournament.
3. Automated checks are reset by the `processing.checks.tournaments` queue consumer (data worker).

Thus, a pattern emerges. Usually, the web backend publishes new queue messages, but the great thing about queues is that anyone can publish a new queue message. This means the processor can publish queue messages to regenerate stats after generating ratings for all tournaments. Another benefit is that the queue will always be live, so even if the data worker goes down, it will resume where it left off upon restart.

### Web application

The web application, located under `otr-web/apps/web`, is both the public-facing site and our API layer. It runs on [Next.js](https://nextjs.org/) using Bun and features server-side rendered pages, oRPC procedures, and auth management via BetterAuth.

### Data worker

The data worker lives under `otr-web/apps/data-worker`. This Bun-based application consumes and publishes [RabbitMQ](https://www.rabbitmq.com/) messages to fetch external osu! data, generate statistics, and run all [[Automated Checks|automated checks]]. It relies on queues to know when to fetch data, what data to fetch, and which tournaments need stats or automated checks to be processed.

Further, it natively supports message queue priority. The platform utilizes priority queues to separate background data fetching from manual data fetching requests. This means admin actions and user submissions are always handled as fast as possible.

### Processor

The processor, located under `otr-web/apps/processor`, is a [Rust](https://www.rust-lang.org/) CLI tool. A cron job on the production host runs it [[Rating Calculation Overview#Rating update schedule|once a week]], on Tuesdays at 12:00 UTC. It looks at all verified tournament data and builds a rating network from individual match data by utilizing OpenSkill[^1], an open-source multiplayer rating algorithm ([source code](https://crates.io/crates/openskill)). For each game the processor hasn't processed before, placements for the game's scores are stored in the `game_scores` table.

Processor releases up to `2026.08.16` were published from the [otr-processor](https://github.com/osu-tournament-rating/otr-processor) repository; later processor releases are [otr-web releases](https://github.com/osu-tournament-rating/otr-web/releases) that changed the processor. The [[Processor Changelog|processor changelog]] records them.

[^1]: Weng, Ruby & Lin, Chih-Jen. (2011). A Bayesian Approximation Method for Online Ranking. Journal of Machine Learning Research. 12. 267-300. <https://jmlr.csail.mit.edu/papers/volume12/weng11a/weng11a.pdf>.
