FROM oven/bun:1
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --filter data-worker build

ENV NODE_ENV=production

CMD ["bun", "run", "--cwd", "apps/data-worker", "start"]
