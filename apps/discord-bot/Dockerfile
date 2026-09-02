FROM oven/bun:1.3
WORKDIR /app

# Manifests first; the install layer caches across source changes.
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/data-worker/package.json apps/data-worker/
COPY apps/discord-bot/package.json apps/discord-bot/
COPY packages/otr-core/package.json packages/otr-core/

RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

CMD ["bun", "run", "--cwd", "apps/discord-bot", "start"]
