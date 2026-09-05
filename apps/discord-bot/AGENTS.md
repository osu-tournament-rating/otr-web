# o!TR Discord bot guidance

Read the repository `AGENTS.md` and `.agents/design/README.md`. This app is under
heavy testing and is not publicly released. The nearly complete `/player` base
view is the design reference; inspect its current branch before extending it.

## Ownership

The bot reads the website's typed `/rpc` API and stores no application data.

- `src/commands/` owns slash-command definitions, API reads, and view selection.
- `src/views/` turns fetched data into `Reply` objects without API calls or state.
- `src/runner.ts` owns interaction deferral, limits, errors, and metrics.
- `src/custom-id.ts` owns button state encoding and validation.
- `src/views/format.ts` owns reusable display formatting; `theme.ts` owns colors.
- `src/chart/` owns SVG creation and PNG rendering using bundled Inter.
- `src/emojis.ts` owns application emoji resolution and synchronization.

Use the type-only router client contract. Preserve the runtime import allowlist
enforced by ESLint. Do not import web schemas at runtime, import bare `@otr/core`,
or connect directly to the database. Carry `x-otr-client: discord-bot` on API calls.

## Message design

Optimize useful information per line and the number of actions needed to reach it.
Keep labels, units, sample sizes, and links clear. Avoid repeated titles, redundant
metadata, oversized decorative charts, and fields that add height without useful
information. Do not abbreviate away the meaning of a statistic.

The `/player` reference uses a compact identity/rating block, paired summary
fields, recent results, one history chart, and Overview/Tournaments/Pooled maps
navigation. It currently pages lists five entries at a time. Reuse its structure
when it fits the command; it is not a mandatory template for every response.

Check long names, large numbers, sparse data, absent ratings/emojis, and the last
page of a list. Keep inline fields readable when the client stacks them. Avoid
alignment that depends on incidental whitespace or a particular username length.
Only retain spacer fields when they are needed for the intended client layout.

Use the bot's shared theme and formatting helpers. Keep website data meanings and
domain colors consistent while respecting Discord's available presentation.
Do not copy CSS color variables into an API payload that needs numeric colors.
Keep core limits and related behavior constants in their owning module.

## Interaction contracts

Keep button state self-contained and versioned so interactions survive restarts.
Preserve the current custom-ID parser/encoder contract; do not reproduce its format
by hand. Check unique IDs within the response, selected/disabled states, pagination
boundaries, and links. The runner remains the single place that answers an
interaction and enforces Discord's payload limits.

Preserve `ReplyError` messages and each command's `NOT_FOUND` behavior. A missing
rating, pending derived statistics, and an API failure are different states.
Do not conceal a failed API call behind invented empty data.

## Local verification

Write tests before changing command logic, formatting behavior, custom-ID handling,
or other non-UI logic. Pure presentation follows the workspace UI test policy;
write and run new UI E2E coverage only after a clean agent review.

From this app, `bun test` runs its tests and `bun run lint` runs its linter. Format
changed files with the repository formatter. Use `src/__tests__/fixtures.ts` and
pure view functions for local payload and PNG inspection without a Discord token.
Inspect the actual generated chart, button data, and message content.

The repository command
`bun run --cwd apps/discord-bot preview player name=Stage` produces reply artifacts.
When using it, set both `INTERNAL_APP_BASE_URL` and `NEXT_PUBLIC_APP_BASE_URL` to
the task's local web URL and leave `DISCORD_BOT_TOKEN` empty. Its API must use the
task's disposable database. It does not render Discord's complete message layout.
Label any local message mockup as an approximation; do not claim actual client
verification from JSON or PNG inspection alone.

For a substantial message redesign, give the user linked payload, chart, and
local message-mockup artifacts for direction approval. The website PR preview
does not display the bot's messages. Keep approval of a mockup distinct from
verification in a real Discord client.

Starting the gateway can register commands and upload application emojis.
Do not start the bot with credentials, register commands, upload emojis, or post
test messages unless the user explicitly authorizes those Discord actions and
their destination. Local review does not require a Discord connection.
