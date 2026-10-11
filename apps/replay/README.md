# otr-replay

`otr-replay` reproduces osu! Tournament Rating (o!TR) player ratings as they were at a certain timestamp provided as input to this application.

Given a UTC timestamp, the program downloads the most recent public database
replica available at that time, imports it into a temporary PostgreSQL container,
runs the most recent processor release that was available when that replica
was taken, and writes the resulting ratings to a CSV file. A reconciliation is also performed as described
in [our online documentation](https://docs.otr.stagec.net/Steps-to-Generate-Ratings#Decay-Reconciliation).

## Processor releases

The processor has been part of [otr-web](https://github.com/osu-tournament-rating/otr-web)
(`apps/processor`) since 2026-10-08, so its releases are otr-web releases, tagged
`YYYY.MM.DD`, or `YYYY.MM.DD.N` for later releases on the same day. Only a release
that changed the processor publishes a `stagecodes/otr-processor` image, and only a
release with both a GitHub release and that image counts; any other release left the
previous processor release in effect. A release becomes available at the later of its
GitHub publication and its image push.

Earlier releases, up to `2026.08.16`, come from the processor's former
[otr-processor](https://github.com/osu-tournament-rating/otr-processor) repository.
Some older otr-web releases share a tag with one of them, such as `2026.08.16`; the
image of that name belongs to otr-processor, so its release is the one used.

## Prerequisites

- [Docker](https://www.docker.com/get-started/)
- [uv](https://docs.astral.sh/uv/)

## Usage

Run the program from the repository root with the UTC timestamp at which the
tournament closed registrations, or another timestamp the ratings were taken from:

```sh
uv run otr-replay --as-of 2026-06-27T23:59
```

`--as-of` expects a timestamp in this format: `YYYY-MM-DDTHH:MM[:SS][Z]`. `:SS`
and the trailing `Z` are optional, and the timestamp is always interpreted as
UTC — so a public replica timestamp such as `2026-08-08T00:06:13Z` can be
pasted as-is.

## Output

Two files are written to the working directory and never overwritten:

- `otr-replay_<timestamp>.csv` with the columns `osu_id`, `username`, `ruleset`,
  `rating`, and `volatility`. `<timestamp>` is the `--as-of` value, e.g.
  `otr-replay_20260627T235900Z.csv`.
- A matching `.metadata.json` which records the inputs — replica snapshot, processor release and the repository it came from, image digests — plus checksums and reconciliation counts for auditing.

## License

MIT
